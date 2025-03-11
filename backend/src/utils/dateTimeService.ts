import * as configService from './configService';

// Default values - will be overridden by database configurations
const DEFAULT_BUSINESS_HOURS = {
  start: '09:00',
  end: '21:00',
};

const DEFAULT_SATURDAY_CUTOFF_HOUR = 18;
const DEFAULT_MIN_BOOKING_HOURS_AHEAD = 6;
const DEFAULT_SLOT_DURATION = 30; // in minutes
const DEFAULT_SUNDAY_BOOKINGS = false;

// Function to check if a date is a Sunday
export const isSunday = (date: Date): boolean => {
  return date.getDay() === 0; // Sunday is 0 in JavaScript Date
};

// Function to check if it's after Saturday cutoff time
export const isAfterSaturdayCutoff = async (date: Date): Promise<boolean> => {
  const day = date.getDay();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  // Get configured cutoff hour from database or use default
  const saturdayCutoffHour = await configService.getConfig<number>(
    'scheduling.saturdayCutoffHour',
    DEFAULT_SATURDAY_CUTOFF_HOUR
  );
  
  // Check if it's Saturday (6) and after cutoff hour
  return day === 6 && (hours > saturdayCutoffHour || (hours === saturdayCutoffHour && minutes > 0));
};

// Check if booking is at least minimum hours from now
export const isAtLeastMinHoursAway = async (bookingTime: Date): Promise<boolean> => {
  const currentTime = new Date();
  
  // Get configured minimum hours ahead from database or use default
  const minBookingHoursAhead = await configService.getConfig<number>(
    'scheduling.minBookingHoursAhead',
    DEFAULT_MIN_BOOKING_HOURS_AHEAD
  );
  
  const minTimeInMs = minBookingHoursAhead * 60 * 60 * 1000;
  
  return bookingTime.getTime() - currentTime.getTime() >= minTimeInMs;
};

// Generate available time slots for a specific date
export const generateTimeSlots = async (date: Date): Promise<{ startTime: string; endTime: string }[]> => {
  const slots: { startTime: string; endTime: string }[] = [];
  
  // Get scheduling configurations
  const schedulingConfigs = await configService.getSchedulingConfigs();
  const { 
    businessHours = DEFAULT_BUSINESS_HOURS,
    slotDuration = DEFAULT_SLOT_DURATION,
    sundayBookings = DEFAULT_SUNDAY_BOOKINGS 
  } = schedulingConfigs;
  
  // Skip generation for Sundays if bookings not allowed
  if (!sundayBookings && isSunday(date)) {
    return slots;
  }
  
  // Check if it's after Saturday cutoff time
  if (await isAfterSaturdayCutoff(date)) {
    return slots;
  }
  
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  
  // Start time processing
  let startHour = parseInt(businessHours.start.split(':')[0], 10);
  let startMinute = parseInt(businessHours.start.split(':')[1], 10);
  
  // End time processing
  const endHour = parseInt(businessHours.end.split(':')[0], 10);
  const endMinute = parseInt(businessHours.end.split(':')[1], 10);
  
  // For today, adjust start time to be at least minimum hours from now
  if (isToday) {
    const minBookingHoursAhead = await configService.getConfig<number>(
      'scheduling.minBookingHoursAhead',
      DEFAULT_MIN_BOOKING_HOURS_AHEAD
    );
    
    const minTimeAhead = new Date(today.getTime() + minBookingHoursAhead * 60 * 60 * 1000);
    
    // Round up to the nearest slot
    let adjustedHour = minTimeAhead.getHours();
    let adjustedMinute = minTimeAhead.getMinutes();
    
    // Round up minutes to the nearest slot duration
    if (adjustedMinute % slotDuration !== 0) {
      adjustedMinute = Math.ceil(adjustedMinute / slotDuration) * slotDuration;
      
      if (adjustedMinute >= 60) {
        adjustedHour += 1;
        adjustedMinute = 0;
      }
    }
    
    // Update start time if min time ahead is after the business start time
    if (adjustedHour > startHour || (adjustedHour === startHour && adjustedMinute >= startMinute)) {
      startHour = adjustedHour;
      startMinute = adjustedMinute;
    }
  }
  
  // Generate slots
  let currentHour = startHour;
  let currentMinute = startMinute;
  
  while (
    currentHour < endHour || 
    (currentHour === endHour && currentMinute < endMinute)
  ) {
    // Format start time
    const startTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    // Calculate end time
    let endTimeHour = currentHour;
    let endTimeMinute = currentMinute + slotDuration;
    
    if (endTimeMinute >= 60) {
      endTimeHour += 1;
      endTimeMinute -= 60;
    }
    
    // Skip if end time exceeds business hours
    if (endTimeHour > endHour || (endTimeHour === endHour && endTimeMinute > endMinute)) {
      break;
    }
    
    // Format end time
    const endTimeStr = `${endTimeHour.toString().padStart(2, '0')}:${endTimeMinute.toString().padStart(2, '0')}`;
    
    // Add slot
    slots.push({
      startTime: startTimeStr,
      endTime: endTimeStr,
    });
    
    // Move to next slot
    currentHour = endTimeHour;
    currentMinute = endTimeMinute;
  }
  
  return slots;
};

// Check if a date is valid for booking
export const isValidBookingDate = async (date: Date): Promise<boolean> => {
  // Create a new date with just the date component (no time)
  const bookingDate = new Date(date.toDateString());
  const currentDate = new Date(new Date().toDateString());
  
  // Can't book in the past
  if (bookingDate < currentDate) {
    return false;
  }
  
  // Check Sunday bookings
  const sundayBookings = await configService.getConfig<boolean>(
    'scheduling.sundayBookings',
    DEFAULT_SUNDAY_BOOKINGS
  );
  
  if (!sundayBookings && isSunday(bookingDate)) {
    return false;
  }
  
  return true;
};

// Format date for display (e.g., "Monday, 25 July 2023")
export const formatDisplayDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Format time for display (e.g., "09:30 AM")
export const formatDisplayTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  
  return `${hour12}:${minutes} ${ampm}`;
}; 