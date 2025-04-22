import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url'; // Import necessary function
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt'; // Add this import at the top

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Calculate path - Go up TWO directories from server/dist to the root
const envPath = path.resolve(__dirname, '../../.env.local'); 

// --- More Debugging --- 
console.log("DEBUG: Attempting to load .env file from path:", envPath);
const dotenvResult = dotenv.config({ path: envPath }); // Store result

if (dotenvResult.error) {
    console.error("DEBUG: dotenv.config() error:", dotenvResult.error);
} else {
    // Log all parsed variables (if any) to see what dotenv *did* find
    console.log("DEBUG: dotenv.config() loaded variables:", dotenvResult.parsed);
}

console.log("DEBUG: Value of VITE_ELEVENLABS_API_KEY in process.env after dotenv.config:", process.env.VITE_ELEVENLABS_API_KEY);
// --- End Debugging ---

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001; // Use a different port than the frontend

const ELEVENLABS_API_KEY = process.env.VITE_ELEVENLABS_API_KEY; // Assuming key is named this in .env.local
const ELEVENLABS_API_BASE_URL = 'https://api.elevenlabs.io/v1';
const JWT_SECRET = process.env.JWT_SECRET;

if (!ELEVENLABS_API_KEY) {
    console.error('Error: VITE_ELEVENLABS_API_KEY not found or empty in process.env. Please check .env.local file and path.');
    // process.exit(1); // Optional: exit if key is missing
} else {
    console.log('ElevenLabs API Key seems loaded into process.env.');
}

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust for production)
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Configure Multer for file uploads (store in memory for now)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // Limit file size (e.g., 50MB)
});

// Define a type for the user payload in the JWT
interface JwtPayload {
  userId: string;
  email: string;
  iat: number; // Issued at time (added automatically by jwt.sign)
  exp: number; // Expiry time (added automatically by jwt.sign)
}

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload; // Optional user property
    }
  }
}

// --- Authentication Middleware ---
const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer TOKEN"

    if (token == null) {
        // No token provided
        console.log('Auth Middleware: No token provided');
        res.sendStatus(401); // Unauthorized
        return;
    }

    if (!JWT_SECRET) {
        // This should ideally not happen if startup checks passed
        console.error('Auth Middleware Error: JWT_SECRET is not configured!');
        res.sendStatus(500); // Internal Server Error
        return;
    }

    jwt.verify(token, JWT_SECRET, (err: any, decodedPayload: any) => {
        if (err) {
            console.log('Auth Middleware: Token verification failed', err.message);
            return res.sendStatus(403); // Forbidden (invalid token)
        }

        // Token is valid, attach payload to request object
        // Type assertion after verification
        req.user = decodedPayload as JwtPayload; 
        console.log('Auth Middleware: Token verified for user', req.user?.email);
        next(); // Proceed to the next middleware or route handler
    });
};

// Define the handler function with explicit RequestHandler type
const registerHandler: RequestHandler = async (req, res, next) => {
    const { email, password } = req.body;

    // Basic Input Validation
    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
    }
    if (typeof email !== 'string' || typeof password !== 'string') {
         res.status(400).json({ error: 'Email and password must be strings.' });
         return;
    }

    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }, 
        });

        if (existingUser) {
            res.status(409).json({ error: 'User with this email already exists.' });
            return;
        }

        // Hash the password
        const saltRounds = 10; 
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user in the database
        const newUser = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password: hashedPassword,
            },
        });

        console.log(`User registered successfully: ${newUser.email} (ID: ${newUser.id})`);
        res.status(201).json({ 
            message: 'User registered successfully!', 
            userId: newUser.id 
        });

    } catch (error: any) {
        console.error('Registration Error:', error);
        next(new Error(`Registration failed: ${error.message}`)); 
    }
};

// POST /api/auth/login
const loginHandler: RequestHandler = async (req, res, next) => {
    const { email, password } = req.body;

    // Basic Input Validation
    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
    }
     if (typeof email !== 'string' || typeof password !== 'string') {
         res.status(400).json({ error: 'Email and password must be strings.' });
         return;
    }

    if (!JWT_SECRET) {
        console.error('Login Error: JWT_SECRET is not configured!');
        return next(new Error('Server configuration error.'));
    }

    try {
        // Find user by email (case-insensitive)
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
             console.log(`Login attempt failed: User not found for email ${email.toLowerCase()}`);
             res.status(401).json({ error: 'Invalid credentials.' });
             return;
        }

        // Compare provided password with the stored hash
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            console.log(`Login attempt failed: Invalid password for email ${email.toLowerCase()}`);
            res.status(401).json({ error: 'Invalid credentials.' });
            return;
        }

        // --- Password is valid - Generate JWT ---
        console.log(`Login successful for user: ${user.email} (ID: ${user.id})`);

        const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
            userId: user.id,
            email: user.email,
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        // Send response (no return needed)
        res.status(200).json({
            message: 'Login successful!',
            token: token,
            userId: user.id,
            email: user.email
        });

    } catch (error: any) {
        console.error('Login Error:', error);
        next(new Error(`Login failed: ${error.message}`));
    }
};

// --- Authentication Routes (Unprotected) ---

// POST /api/auth/register
app.post('/api/auth/register', registerHandler); // Pass the defined handler

// Register the login handler
app.post('/api/auth/login', loginHandler);

// --- Voice / TTS Routes ---

// GET list of available voices
app.get('/api/voices', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!ELEVENLABS_API_KEY) {
        res.status(500).json({ error: 'API key not configured' });
        return;
    }
    try {
        const response = await axios.get(`${ELEVENLABS_API_BASE_URL}/voices`, {
            headers: { 'xi-api-key': ELEVENLABS_API_KEY },
        });
        res.json(response.data.voices);
    } catch (error: any) {
        console.error('Error fetching voices:', error.response?.data || error.message);
        // Pass error to error handler middleware
        next(new Error(`Failed to fetch voices from ElevenLabs: ${error.response?.statusText || error.message}`)); 
    }
});

// POST: Add a new voice
app.post('/api/voices', authenticateToken, upload.array('files', 30), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
     if (!ELEVENLABS_API_KEY) {
        res.status(500).json({ error: 'API key not configured' });
        return;
    }
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json({ error: 'No audio files provided for cloning.' });
        return;
    }
    if (!req.body.name) {
         res.status(400).json({ error: 'Voice name is required.' });
         return;
    }

    const voiceName = req.body.name;
    const description = req.body.description || `Cloned voice: ${voiceName}`;
    const labels = req.body.labels ? JSON.stringify(req.body.labels) : '{}';

    console.log(`Received ${req.files.length} files for voice cloning: ${voiceName}`);

    const formData = new FormData();
    formData.append('name', voiceName);
    formData.append('description', description);
    formData.append('labels', labels);

    (req.files as Express.Multer.File[]).forEach((file) => {
        const blob = new Blob([file.buffer], { type: file.mimetype });
        formData.append('files', blob, file.originalname);
        console.log(`Appending file: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);
    });

    try {
        console.log('Sending request to ElevenLabs API to add voice...');
        const response = await axios.post(`${ELEVENLABS_API_BASE_URL}/voices/add`, formData, {
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        });
        console.log('ElevenLabs add voice response:', response.data);
        res.status(201).json({ voice_id: response.data.voice_id, name: voiceName });
    } catch (error: any) {
        console.error('Error adding voice:', error.response?.data || error.message);
         if (axios.isAxiosError(error)) {
            console.error('Axios error details:', error.toJSON());
        }
        // Pass error to error handler middleware
        next(new Error(`Failed to add voice via ElevenLabs API: ${error.response?.statusText || error.message}`));
    }
});


// POST: Generate Text-to-Speech
app.post('/api/tts/:voice_id', authenticateToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!ELEVENLABS_API_KEY) {
        res.status(500).json({ error: 'API key not configured' });
        return;
    }
    
    const { voice_id } = req.params;
    const { text, model_id, voice_settings } = req.body;

    if (!text) {
        res.status(400).json({ error: 'Text input is required.' });
        return;
    }

    console.log(`Generating TTS for voice_id: ${voice_id}`);

    try {
        const requestBody: any = {
            text: text,
            model_id: model_id || 'eleven_multilingual_v2',
        };
        
        if (voice_settings) {
             try {
                requestBody.voice_settings = typeof voice_settings === 'string' ? JSON.parse(voice_settings) : voice_settings;
            } catch (parseError: any) {
                console.error("Error parsing voice_settings JSON:", parseError);
                res.status(400).json({ error: 'Invalid voice_settings format.' });
                return;
            }
        }

        const response = await axios.post(
            `${ELEVENLABS_API_BASE_URL}/text-to-speech/${voice_id}/stream`,
            requestBody,
            {
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg',
                },
                responseType: 'stream',
            }
        );

        console.log('Received audio stream from ElevenLabs.');
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Accept-Ranges', 'bytes');
        response.data.pipe(res);

        // Handle stream events directly on response.data
        response.data.on('end', () => {
            console.log('Audio stream finished.');
            // res.end() is handled by pipe
        });
        response.data.on('error', (err: Error) => {
            console.error('Error piping audio stream:', err);
            next(err); // Pass stream errors to the error handler
        });

    } catch (error: any) {
        console.error('Error generating TTS:', error.response?.data || error.message);

        // Check if the error response itself is a stream (contains JSON error from ElevenLabs)
        if (axios.isAxiosError(error) && error.response?.data instanceof Readable) {
            let errorData = '';
            const errorStream = error.response.data as Readable;
            errorStream.on('data', (chunk: Buffer) => errorData += chunk.toString());
            errorStream.on('end', () => {
                 try {
                     const parsedError = JSON.parse(errorData);
                     console.error('ElevenLabs TTS Error Body:', parsedError);
                     // Pass a structured error to the handler
                     const apiError = new Error('ElevenLabs API Error');
                     (apiError as any).status = error.response?.status || 500;
                     (apiError as any).details = parsedError;
                     next(apiError); 
                 } catch (e) {
                     console.error('Could not parse ElevenLabs error stream:', errorData);
                     next(new Error(`ElevenLabs TTS Error (Unparseable): ${error.response?.statusText || 'Unknown'}`));
                 }
             });
             errorStream.on('error', (streamErr: Error) => { // Handle errors reading the error stream
                 console.error('Error reading ElevenLabs error stream:', streamErr);
                 next(new Error(`ElevenLabs TTS Error (Stream Read Fail): ${error.response?.statusText || 'Unknown'}`));
             });
        } else {
            // Handle other errors (network, non-stream Axios errors, etc.)
             const genericError = new Error(`Failed to generate TTS: ${error.response?.statusText || error.message}`);
             (genericError as any).status = error.response?.status || 500;
             (genericError as any).details = axios.isAxiosError(error) ? error.response?.data : undefined;
             next(genericError); 
        }
    }
});

// Error handler middleware - improved
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("--- Server Error Handler ---");
    console.error(err.stack || err);
    const status = err.status || 500;
    const message = err.message || 'Something broke!';
    const details = err.details;
    
    // Avoid sending response if headers already sent (e.g., by stream error)
    if (res.headersSent) {
        console.error("Headers already sent, cannot send error response.");
        return next(err); // Pass to default Express handler if needed
    }

    res.status(status).json({
        error: message,
        ...(details && { details: details }) // Include details if they exist
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Backend server listening on http://localhost:${PORT}`);
}); 