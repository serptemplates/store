import './minimal.css';

export default function MinimalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="minimal-wrapper">
      {children}
    </div>
  );
}