import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  await axios.post(
    process.env.MAIL_API_URL as string,
    {
      to,
      subject: 'Vérifie ton adresse email - Nano',
      body: `Ton code de vérification est : ${code}\n\nIl expire dans 15 minutes. Si tu n'es pas à l'origine de cette demande, ignore cet email.`,
      from_name: 'Nano'
    },
    {
      headers: {
        'X-API-Key': process.env.MAIL_API_KEY as string,
        'Content-Type': 'application/json'
      }
    }
  );
}
