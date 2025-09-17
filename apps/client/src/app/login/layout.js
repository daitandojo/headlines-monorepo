// This layout applies only to the /login page.
// It ensures that no data-heavy components from the main layout are loaded
// for unauthenticated users.
export default function LoginLayout({ children }) {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: 'hsl(224, 71.4%, 4.1%)',
        backgroundImage: `
          radial-gradient(at 27% 37%, hsla(215, 98%, 43%, 0.1) 0px, transparent 50%),
          radial-gradient(at 97% 21%, hsla(217, 91%, 60%, 0.15) 0px, transparent 50%),
          radial-gradient(at 52% 99%, hsla(355, 98%, 51%, 0.1) 0px, transparent 50%),
          radial-gradient(at 10% 90%, hsla(200, 98%, 51%, 0.1) 0px, transparent 50%)
        `
      }}
    >
        {children}
    </div>
  );
}