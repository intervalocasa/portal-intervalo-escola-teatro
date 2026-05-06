/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Centralized branding and color configuration
// Changing these constants will update the visual identity across the app

export const THEME = {
  colors: {
    primary: "pro-teal", // Used for buttons, progress bars, active states
    secondary: "pro-orange", // Used for accents, warnings
    accent: "yellow-400", // Highlights
    danger: "red-600", // Delete actions, critical warnings
    dangerBg: "red-50",
    dangerBorder: "red-100",
    success: "green-600",
    neutral: "slate-500",
    neutralBg: "slate-50",
    surface: "white",
    background: "slate-50"
  },
  
  // Tailwind class strings for common UI patterns
  styles: {
    buttonPrimary: "bg-pro-teal text-white hover:bg-[#014e63]",
    buttonSecondary: "bg-pro-orange text-white hover:bg-[#e67000]",
    buttonDanger: "bg-red-600 text-white hover:bg-red-700",
    buttonGhost: "text-slate-500 hover:bg-slate-100",
    
    card: "bg-white rounded-3xl shadow-lg border border-slate-100",
    input: "w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pro-teal focus:outline-none font-bold text-sm",
    
    badge: "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
  }
};
