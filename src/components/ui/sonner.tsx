import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "light" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast border border-white/70 bg-white/82 text-[#1C1C1E] shadow-[var(--shadow-card)] backdrop-blur-[20px]",
          title: "font-display text-sm font-semibold text-[#1C1C1E]",
          description: "text-[13px] text-[#8E8E93]",
          actionButton:
            "bg-[linear-gradient(135deg,#00B4FF,#0099FF)] text-white hover:opacity-95",
          cancelButton:
            "bg-white/70 text-[#8E8E93] hover:bg-white/90",
          success: "border-l-[3px] border-l-[#34C759]",
          error: "border-l-[3px] border-l-[#E24B4A]",
          warning: "border-l-[3px] border-l-[#F0A500]",
          info: "border-l-[3px] border-l-[#00A3FF]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
