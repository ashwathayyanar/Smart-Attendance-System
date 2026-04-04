export const sendManualAlert = async (student: any) => {
  const message = `ALERT: Student ${student.fullName} (Reg: ${student.studentId}) of Class ${student.className}-${student.section} was ABSENT today. Reason: Inform to CC immediately.`;

  try {
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${process.env.SMS_API_KEY}&route=q&message=${encodeURIComponent(message)}&numbers=${student.mobile}`;
    
    const response = await fetch(url);
    const result = await response.json();
    
    // ADD THIS LINE TO SEE THE ERROR IN VERCEL LOGS
    console.log("SMS Provider Response:", result);

    return result.return === true; 
  } catch (error) {
    console.error("SMS Service Error:", error);
    return false;
  }
};