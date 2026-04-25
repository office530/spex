import { Font } from '@react-pdf/renderer';

let registered = false;

// Register Rubik (the app's UI font) so Hebrew renders correctly.
// Google Fonts hosts the variable+static files at fonts.gstatic.com.
export function registerHebrewFont() {
  if (registered) return;
  Font.register({
    family: 'Rubik',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/rubik/v28/iJWZBXyIfDnIV7nFrXyw023e1Ik.ttf', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/rubik/v28/iJWZBXyIfDnIV7nKrXyw023e1Ik.ttf', fontWeight: 500 },
      { src: 'https://fonts.gstatic.com/s/rubik/v28/iJWZBXyIfDnIV7nMrnyw023e1Ik.ttf', fontWeight: 700 },
    ],
  });
  registered = true;
}
