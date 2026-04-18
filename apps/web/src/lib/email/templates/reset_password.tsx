import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface ResetPasswordProps {
  userName?: string;
  resetUrl: string;
}

export const ResetPassword = ({ userName = "there", resetUrl }: ResetPasswordProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your Lexiflix password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>Reset Your Password</Heading>
            <Text style={paragraph}>Hi {userName},</Text>
            <Text style={paragraph}>
              We received a request to reset your password for your Lexiflix account.
            </Text>
            <Text style={paragraph}>Click the button below to reset your password:</Text>
            <Button style={button} href={resetUrl}>
              Reset Password
            </Button>
            <Hr style={hr} />
            <Text style={paragraph}>Or copy and paste this URL into your browser:</Text>
            <Link href={resetUrl} style={anchor}>
              {resetUrl}
            </Link>
            <Hr style={hr} />
            <Text style={footer}>
              If you didn't request a password reset, you can safely ignore this email. Your
              password will remain unchanged.
            </Text>
            <Text style={footer}>This link will expire in 1 hour for security reasons.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default ResetPassword;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const box = {
  padding: "0 48px",
};

const heading = {
  fontSize: "32px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#484848",
  marginBottom: "24px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.4",
  color: "#484848",
  marginBottom: "16px",
};

const button = {
  backgroundColor: "#5469d4",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  width: "100%",
  padding: "12px",
  marginTop: "16px",
  marginBottom: "16px",
};

const anchor = {
  color: "#5469d4",
  fontSize: "14px",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  marginBottom: "8px",
};
