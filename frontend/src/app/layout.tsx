export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>NETURION — Confidential AI Agent</title>
        <meta name="description" content="End-to-end encrypted AI powered by Fairblock Network"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
