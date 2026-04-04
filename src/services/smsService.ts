export const sendManualAlert = async (student: any) => {
  const message = `ALERT: Student ${student.fullName} (Reg: ${student.studentId}) of Class ${student.className}-${student.section} was ABSENT today. Reason: Inform to CC immediately.`;

  try {
    // Fast2SMS Quick SMS API
    const response = await fetch(`https://www.fast2sms.com/dev/bulkV2?authorization=${process.env.SMS_API_KEY}&route=q&message=${encodeURIComponent(message)}&numbers=${student.mobile}`);
    
    const result = await response.json();
    return result.return; // returns true if sent
  } catch (error) {
    console.error("SMS Service Error:", error);
    return false;
  }
};