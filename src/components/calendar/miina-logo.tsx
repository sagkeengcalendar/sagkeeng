interface LogoProps { size?: number; className?: string; }
export function MiinaLogo({ size = 40, className = "" }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="miina logo">
      <path d="M50 8 C46 18, 44 26, 44 34 C44 38, 47 40, 50 40 C53 40, 56 38, 56 34 C56 26, 54 18, 50 8 Z" fill="#147D6F" />
      <path d="M50 92 C54 82, 56 74, 56 66 C56 62, 53 60, 50 60 C47 60, 44 62, 44 66 C44 74, 46 82, 50 92 Z" fill="#147D6F" />
      <path d="M8 50 C18 46, 26 44, 34 44 C38 44, 40 47, 40 50 C40 53, 38 56, 34 56 C26 56, 18 54, 8 50 Z" fill="#147D6F" />
      <path d="M92 50 C82 54, 74 56, 66 56 C62 56, 60 53, 60 50 C60 47, 62 44, 66 44 C74 44, 82 46, 92 50 Z" fill="#147D6F" />
      <path d="M20 20 C28 24, 34 30, 38 36 C40 39, 39 42, 36 44 C33 46, 30 45, 28 42 C24 38, 22 30, 20 20 Z" fill="#147D6F" />
      <path d="M80 20 C72 24, 66 30, 62 36 C60 39, 61 42, 64 44 C67 46, 70 45, 72 42 C76 38, 78 30, 80 20 Z" fill="#147D6F" />
      <path d="M20 80 C28 76, 34 70, 38 64 C40 61, 39 58, 36 56 C33 54, 30 55, 28 58 C24 62, 22 70, 20 80 Z" fill="#147D6F" />
      <path d="M80 80 C72 76, 66 70, 62 64 C60 61, 61 58, 64 56 C67 54, 70 55, 72 58 C76 62, 78 70, 80 80 Z" fill="#147D6F" />
      <circle cx="50" cy="50" r="14" fill="#C75B39" />
    </svg>
  );
}
