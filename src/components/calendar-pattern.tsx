import { Calendar } from "lucide-react";

interface CalendarPatternProps {
  variant?: "default" | "dense";
  opacity?: string;
  className?: string;
}

export function CalendarPattern({ 
  variant = "default", 
  opacity = "opacity-5", 
  className = "" 
}: CalendarPatternProps) {
  if (variant === "dense") {
    return (
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${opacity} ${className}`}>
        <Calendar className="absolute top-[3%] left-[5%] w-8 h-8 text-[#374151] rotate-12" />
        <Calendar className="absolute top-[8%] right-[8%] w-6 h-6 text-[#374151] -rotate-12" />
        <Calendar className="absolute top-[15%] left-[15%] hidden h-7 w-7 rotate-45 text-[#374151] sm:block" />
        <Calendar className="absolute top-[15%] right-[25%] hidden h-6 w-6 -rotate-6 text-[#374151] sm:block" />
        <Calendar className="absolute top-[22%] left-[35%] hidden h-8 w-8 rotate-6 text-[#374151] sm:block" />
        <Calendar className="absolute top-[28%] right-[5%] hidden h-7 w-7 -rotate-45 text-[#374151] sm:block" />
        <Calendar className="absolute top-[35%] left-[8%] hidden h-6 w-6 rotate-12 text-[#374151] sm:block" />
        <Calendar className="absolute top-[42%] right-[18%] hidden h-8 w-8 -rotate-12 text-[#374151] sm:block" />
        <Calendar className="absolute top-[48%] left-[25%] hidden h-7 w-7 rotate-45 text-[#374151] sm:block" />
        <Calendar className="absolute top-[55%] right-[10%] hidden h-6 w-6 -rotate-6 text-[#374151] sm:block" />
        <Calendar className="absolute top-[62%] left-[12%] hidden h-8 w-8 rotate-6 text-[#374151] sm:block" />
        <Calendar className="absolute top-[68%] right-[28%] hidden h-7 w-7 -rotate-45 text-[#374151] sm:block" />
        <Calendar className="absolute top-[75%] left-[30%] hidden h-6 w-6 rotate-12 text-[#374151] sm:block" />
        <Calendar className="absolute top-[82%] right-[15%] hidden h-8 w-8 -rotate-12 text-[#374151] sm:block" />
        <Calendar className="absolute bottom-[8%] left-[18%] hidden h-7 w-7 rotate-45 text-[#374151] sm:block" />
        <Calendar className="absolute bottom-[5%] right-[35%] hidden h-6 w-6 -rotate-6 text-[#374151] sm:block" />
        <Calendar className="absolute bottom-[3%] left-[50%] hidden h-8 w-8 rotate-6 text-[#374151] sm:block" />
        <Calendar className="absolute top-[5%] left-[45%] hidden h-7 w-7 -rotate-12 text-[#374151] md:block" />
        <Calendar className="absolute top-[10%] right-[40%] hidden h-6 w-6 rotate-45 text-[#374151] md:block" />
        <Calendar className="absolute top-[18%] left-[60%] hidden h-8 w-8 -rotate-6 text-[#374151] md:block" />
        <Calendar className="absolute top-[25%] right-[45%] hidden h-7 w-7 rotate-6 text-[#374151] md:block" />
        <Calendar className="absolute top-[32%] left-[50%] hidden h-6 w-6 -rotate-45 text-[#374151] md:block" />
        <Calendar className="absolute top-[38%] right-[35%] hidden h-8 w-8 rotate-12 text-[#374151] md:block" />
        <Calendar className="absolute top-[45%] left-[70%] hidden h-7 w-7 -rotate-12 text-[#374151] md:block" />
        <Calendar className="absolute top-[52%] right-[50%] hidden h-6 w-6 rotate-45 text-[#374151] md:block" />
        <Calendar className="absolute top-[60%] left-[40%] hidden h-8 w-8 -rotate-6 text-[#374151] md:block" />
        <Calendar className="absolute top-[72%] right-[55%] hidden h-7 w-7 rotate-6 text-[#374151] md:block" />
        <Calendar className="absolute top-[78%] left-[65%] hidden h-6 w-6 -rotate-45 text-[#374151] md:block" />
        <Calendar className="absolute bottom-[10%] right-[60%] hidden h-8 w-8 rotate-12 text-[#374151] md:block" />
        <Calendar className="absolute bottom-[4%] left-[75%] hidden h-7 w-7 -rotate-12 text-[#374151] md:block" />
      </div>
    );
  }
  
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${opacity} ${className}`}>
      <Calendar className="absolute top-10 left-10 w-12 h-12 text-[#374151] rotate-12" />
      <Calendar className="absolute top-20 right-20 w-10 h-10 text-[#374151] -rotate-12" />
      <Calendar className="absolute top-40 left-1/4 w-14 h-14 text-[#374151] rotate-45" />
      <Calendar className="absolute top-60 right-1/4 w-10 h-10 text-[#374151] -rotate-6" />
      <Calendar className="absolute bottom-40 left-1/3 w-12 h-12 text-[#374151] rotate-6" />
      <Calendar className="absolute bottom-20 right-1/3 w-14 h-14 text-[#374151] -rotate-45" />
      <Calendar className="absolute top-1/3 left-10 w-10 h-10 text-[#374151] rotate-12" />
      <Calendar className="absolute top-2/3 right-10 w-12 h-12 text-[#374151] -rotate-12" />
    </div>
  );
}
