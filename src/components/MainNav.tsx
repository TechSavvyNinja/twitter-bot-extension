
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/assets/logo";
import { useLicense } from "@/contexts/LicenseContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, Twitter } from "lucide-react";

export function MainNav() {
  const { isActivated } = useLicense();
  const { theme, setTheme } = useTheme();
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-10 items-center px-3 justify-between">
        <div className="flex items-center">
          <Link to="/" className="mr-3 flex items-center space-x-1.5">
            <Logo className="h-4 w-4" />
            <span className="font-bold text-xs gradient-text">
              Tweet Boost Buddy
            </span>
          </Link>
          <nav className="hidden sm:flex items-center space-x-3 text-xs font-medium">
            <Link
              to="/"
              className="transition-colors hover:text-foreground/80 text-foreground"
            >
              Home
            </Link>
            {isActivated && (
              <Link
                to="/dashboard"
                className="transition-colors hover:text-foreground/80 text-foreground"
              >
                Dashboard
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center space-x-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
          
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" asChild>
            <a href="https://twitter.com" target="_blank" rel="noreferrer">
              <Twitter className="mr-1 h-3 w-3" />
              <span className="text-xs">Twitter</span>
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
