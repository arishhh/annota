import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Explicitly using gmail as per user provided creds, though 'service: gmail' also works
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendApprovalEmail = async (to: string, projectName: string, approvalUrl: string, pin: string) => {
    // Fallback/Default sender
    const from = process.env.CONTACT_RECEIVER_EMAIL || process.env.SMTP_USER || 'info@itnnovator.com';

    try {
        const info = await transporter.sendMail({
            from: `"Itnnovator" <${from}>`,
            to,
            subject: `Action Required: Approve ${projectName}`,
            html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B0D12; color: #ffffff; }
        .container { max-width: 600px; margin: 0 auto; background-color: #14171F; border-radius: 12px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; border: 1px solid rgba(255,255,255,0.1); }
        .header { background-color: #0B0D12; padding: 30px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .content { padding: 40px 30px; text-align: center; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 16px; color: #ffffff; }
        .text { font-size: 16px; line-height: 1.6; color: #b0b0b0; margin-bottom: 30px; }
        .pin-container { background: rgba(0, 243, 255, 0.05); border: 1px dashed rgba(0, 243, 255, 0.3); border-radius: 8px; padding: 20px; display: inline-block; margin-bottom: 30px; }
        .pin-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #00F3FF; margin-bottom: 8px; font-weight: 600; }
        .pin-code { font-size: 32px; font-family: monospace; font-weight: bold; color: #ffffff; letter-spacing: 4px; }
        .button { display: inline-block; background-color: #00F3FF; color: #000000; padding: 14px 32px; font-weight: bold; text-decoration: none; border-radius: 6px; font-size: 16px; transition: opacity 0.2s; }
        .button:hover { opacity: 0.9; }
        .footer { padding: 30px; text-align: center; font-size: 12px; color: #555555; background-color: #0B0D12; border-top: 1px solid rgba(255,255,255,0.05); }
        .highlight { color: #ffffff; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
           <img src="https://itnnovator.com/logo.png" alt="ITnnovator" style="height: 30px; width: auto;">
        </div>
        <div class="content">
            <h1 class="title">Project Approval</h1>
            <p class="text">
                The project <span class="highlight">${projectName}</span> is ready for your review.<br>
                Please use the PIN below to securely approve the project.
            </p>
            
            <div class="pin-container">
                <div class="pin-label">Your Secure PIN</div>
                <div class="pin-code">${pin}</div>
            </div>

            <div style="margin-bottom: 10px;">
                <a href="${approvalUrl}" class="button">Review & Approve</a>
            </div>
            
            <p style="font-size: 13px; color: #adadadff; margin-top: 30px;">
                Or copy this link: <br>
                <a href="${approvalUrl}" style="color: #adadadff; text-decoration: underline;">${approvalUrl}</a>
            </p>
        </div>
        <div class="footer">
            &copy; ${new Date().getFullYear()} ITnnovator. All rights reserved.<br>
            If you did not request this, please ignore this email.
        </div>
    </div>
</body>
</html>
            `
        });


        return true;
    } catch (e) {
        console.error('Email exception:', e);
        return false;
    }
};
