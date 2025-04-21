import { Occasion, Voice } from '../types';

export const MAX_CHARACTERS = 500;

export const API_URL = "https://api.elevenlabs.io/v1";

export const OCCASIONS: Occasion[] = [
  {
    id: "birthday",
    name: "Birthday",
    emoji: "🎂",
    templates: [
      "Happy birthday! Wishing you a fantastic day filled with joy and laughter!",
      "Another year older, another year wiser. Hope your day is as wonderful as you are!",
      "It's your special day! Hope it's filled with all your favorite things and people."
    ]
  },
  {
    id: "anniversary",
    name: "Anniversary",
    emoji: "💍",
    templates: [
      "Happy anniversary! Celebrating the love you share today and always.",
      "Cheers to another year of making memories together! Happy anniversary!",
      "Congratulations on another year of love, laughter, and happily ever after."
    ]
  },
  {
    id: "congratulations",
    name: "Congratulations",
    emoji: "🎉",
    templates: [
      "Congratulations on your achievement! So proud of what you've accomplished!",
      "You did it! Sending my warmest congratulations on your success!",
      "Way to go! Your hard work and dedication have truly paid off."
    ]
  },
  {
    id: "thank_you",
    name: "Thank You",
    emoji: "🙏",
    templates: [
      "Thank you so much for everything you've done. It means the world to me!",
      "I can't thank you enough for your kindness and support.",
      "Just wanted to say a heartfelt thank you for being there when I needed it most."
    ]
  },
  {
    id: "holiday",
    name: "Holiday",
    emoji: "🎄",
    templates: [
      "Wishing you a joyful holiday season filled with peace and happiness!",
      "May your holidays be merry and bright! Sending warmest wishes your way.",
      "Happy holidays! Hope this season brings you joy and wonderful memories."
    ]
  }
];

export const VOICES: Voice[] = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", description: "Calm and clear female voice" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", description: "Warm and natural female voice" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", description: "Soft and gentle female voice" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", description: "Strong and assertive male voice" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", description: "Young and friendly female voice" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", description: "Deep and smooth male voice" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", description: "Bold and confident male voice" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", description: "Clear and professional male voice" }
];