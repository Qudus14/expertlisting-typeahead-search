import "./globals.css";

export const metadata = {
  title: "Typeahead Search Demo",
  description: "Debounced, keyboard-navigable typeahead search built for Expert Listing screening task",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen">{children}</body>
    </html>
  );
}
