// Logo officiel des EI d'Israël — groupe local Israël Ron Arad (source : eeisrael.org).
export default function GalaLogo({ size = 64 }: { size?: number }) {
  return <img src="/logo-ei-israel.png" alt="EI d’Israël — groupe Israël Ron Arad" width={size} height={size} style={{ objectFit: 'contain' }} />;
}
