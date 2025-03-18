
import { createContext, useContext, useEffect, useState } from "react";

type LicenseContextType = {
  isActivated: boolean;
  licenseKey: string;
  setLicenseKey: (key: string) => void;
  activateLicense: () => Promise<boolean>;
  loading: boolean;
};

const initialState: LicenseContextType = {
  isActivated: false,
  licenseKey: "",
  setLicenseKey: () => null,
  activateLicense: async () => false,
  loading: true,
};

const LicenseContext = createContext<LicenseContextType>(initialState);

export function LicenseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [licenseKey, setLicenseKey] = useState("");
  const [isActivated, setIsActivated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize from storage
  useEffect(() => {
    const initLicense = async () => {
      try {
        // Check if chrome is available (only in extension context)
        if (typeof window !== 'undefined' && 'chrome' in window && window.chrome.storage) {
          const result = await new Promise<any>((resolve) => {
            window.chrome.storage.local.get(['licenseKey', 'isActivated'], (data) => {
              resolve(data);
            });
          });
          
          setLicenseKey(result.licenseKey || "");
          setIsActivated(result.isActivated || false);
        } else {
          // If not in extension context (e.g. development), use localStorage
          const storedKey = localStorage.getItem("licenseKey") || "";
          const storedActivation = localStorage.getItem("isActivated") === "true";
          
          setLicenseKey(storedKey);
          setIsActivated(storedActivation);
        }
      } catch (error) {
        console.error("Error loading license:", error);
      } finally {
        setLoading(false);
      }
    };

    initLicense();
  }, []);

  const activateLicense = async (): Promise<boolean> => {
    try {
      if (typeof window !== 'undefined' && 'chrome' in window && window.chrome.runtime) {
        // In extension context
        // Modified to accept any license key as valid
        const isValid = licenseKey.length > 0;
        
        // Store the activation state
        if (isValid) {
          window.chrome.storage.local.set({ 
            licenseKey, 
            isActivated: true 
          });
        }
        
        setIsActivated(isValid);
        return isValid;
      } else {
        // FOR TESTING: Accept any license key
        const isValid = licenseKey.length > 0;
        setIsActivated(isValid);
        localStorage.setItem("licenseKey", licenseKey);
        localStorage.setItem("isActivated", isValid.toString());
        return isValid;
      }
    } catch (error) {
      console.error("License activation error:", error);
      return false;
    }
  };

  return (
    <LicenseContext.Provider
      value={{
        isActivated,
        licenseKey,
        setLicenseKey,
        activateLicense,
        loading,
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
}

export const useLicense = () => {
  const context = useContext(LicenseContext);
  
  if (context === undefined)
    throw new Error("useLicense must be used within a LicenseProvider");
    
  return context;
};
