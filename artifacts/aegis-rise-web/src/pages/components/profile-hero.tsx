import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileHeroProps {
  member: {
    name?: string;
    title?: string;
    company?: string;
    bio?: string | null;
    profilePictureUrl?: string | null;
  } | null;
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  wallpaperUrl?: string | null;
  wallpaperScale?: number;
}

export function ProfileHero({ 
  member, 
  primaryColor = "#00aaff", 
  accentColor = "#00aaff", 
  backgroundColor = "#0a0a0a", 
  wallpaperUrl,
  wallpaperScale = 100,
}: ProfileHeroProps) {
  // Ensure default colors to prevent errors
  const bg = backgroundColor || "#0a0a0a";
  const primary = primaryColor || "#00aaff";
  const accent = accentColor || primary;
  const scale = Math.min(200, Math.max(50, wallpaperScale || 100));
  
  return (
    <div 
      className="relative overflow-hidden rounded-xl border border-border shadow-lg transition-all duration-500 ease-in-out" 
      style={{ backgroundColor: bg }}
      data-testid="profile-hero"
    >
      {/* Background Layer with Wallpaper */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out"
        style={{ 
          backgroundImage: wallpaperUrl ? `url(${wallpaperUrl})` : 'none',
          opacity: wallpaperUrl ? 0.35 : 0,
          mixBlendMode: 'luminosity',
          transform: `scale(${scale / 100})`,
          transformOrigin: "center",
        }}
      />
      {/* Gradient to darken the bottom for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      {/* Accent glow in the corner */}
      <div 
        className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] opacity-40 mix-blend-screen pointer-events-none transition-all duration-700 ease-in-out"
        style={{ backgroundColor: accent }}
      />
      
      <div className="relative z-10 p-6 md:p-8 pt-20 flex flex-col md:flex-row items-center md:items-end gap-6 backdrop-blur-[1px]">
        <Avatar 
          className="h-32 w-32 md:h-40 md:w-40 border-4 shadow-xl transition-all duration-500 hover:scale-105" 
          style={{ borderColor: primary, boxShadow: `0 4px 30px ${primary}40` }}
        >
          <AvatarImage src={member?.profilePictureUrl || ""} alt={member?.name || "Profile"} />
          <AvatarFallback className="text-5xl font-display font-bold" style={{ backgroundColor: `${primary}20`, color: primary }}>
            {member?.name?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 text-center md:text-left text-white pb-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight drop-shadow-md">
            {member?.name || "Your Name"}
          </h1>
          <p className="text-lg md:text-xl font-medium mt-1 drop-shadow-md" style={{ color: accent }}>
            {member?.title || "Professional Title"} <span className="text-white/70 font-normal">at {member?.company || "Organization"}</span>
          </p>
          
          {member?.bio && (
            <p className="mt-4 text-white/90 max-w-2xl leading-relaxed text-sm md:text-base bg-black/40 backdrop-blur-md p-4 rounded-lg border border-white/10 shadow-inner">
              {member.bio}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
