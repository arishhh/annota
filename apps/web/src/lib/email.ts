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
                    <p>The project <strong>${projectName}</strong> is ready for your final approval.</p>
                    <p>Click the link below to review and approve it:</p>
                    <a href="${approvalUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Review Project</a>
                    <p>Your Approval PIN: <strong>${pin}</strong></p>
                    <p style="color: #666; font-size: 12px; margin-top: 24px;">If you did not expect this email, please ignore it.</p>
                </div>
            `
        });

        if (error) {
            console.error('Email error:', error);
            return false;
        }

        return true;
    } catch (e) {
        console.error('Email exception:', e);
        return false;
    }
};
