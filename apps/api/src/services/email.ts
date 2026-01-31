import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendApprovalEmail = async (to: string, projectName: string, approvalUrl: string, pin: string) => {
    const from = process.env.EMAIL_FROM || 'onboarding@resend.dev'; // Default for Resend testing

    try {
        const { data, error } = await resend.emails.send({
            from,
            to,
            subject: `Approve Project: ${projectName}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Project Approval Request</h2>
                    <p>You have been requested to review and approve the project <strong>${projectName}</strong>.</p>
                    
                    <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <p style="margin-bottom: 10px; color: #555;">Your Approval PIN:</p>
                        <h1 style="margin: 0; letter-spacing: 5px; font-size: 32px;">${pin}</h1>
                    </div>

                    <p>Click the link below and enter the PIN above to finalize approval:</p>
                    <p>
                        <a href="${approvalUrl}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                            Go to Approval Page
                        </a>
                    </p>
                    <p style="font-size: 12px; color: #666; margin-top: 30px;">
                        If you didn't request this, please ignore this email.
                    </p>
                </div>
            `
        });

        if (error) {
            console.error('Resend Error:', error);
            return false;
        }

        console.log(`Email sent to ${to}`, data);
        return true;
    } catch (error) {
        console.error('Email send failed:', error);
        return false;
    }
};
