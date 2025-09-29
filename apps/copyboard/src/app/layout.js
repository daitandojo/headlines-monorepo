import './globals.css';
import { AppProviders } from './providers';
import { AppWrapper } from './_components/AppWrapper';

export const metadata = { /* ... */ };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <AppWrapper>{children}</AppWrapper>
        </AppProviders>
      </body>
    </html>
  );
}