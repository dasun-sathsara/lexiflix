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

interface PackStatusEmailProps {
  userName: string;
  status: "completed" | "failed";
  packTitle: string;
  actionUrl: string;
}

export const PackStatusEmail = ({
  userName,
  status,
  packTitle,
  actionUrl,
}: PackStatusEmailProps) => {
  const isCompleted = status === "completed";
  const heading = isCompleted ? "Your pack is ready!" : "Pack generation failed";
  const preview = isCompleted
    ? `${packTitle} vocabulary pack is ready to study`
    : `${packTitle} vocabulary pack could not be generated`;
  const bodyText = isCompleted
    ? `Great news! Your vocabulary pack for "${packTitle}" has been generated and is ready for study.`
    : `Unfortunately, we weren't able to generate your vocabulary pack for "${packTitle}". You can retry the generation from the link below.`;
  const buttonText = isCompleted ? "Start Studying" : "View Details";
  const buttonColor = isCompleted ? "#22c55e" : "#ef4444";

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={headingStyle}>{heading}</Heading>
            <Text style={paragraph}>Hi {userName},</Text>
            <Text style={paragraph}>{bodyText}</Text>
            <Button style={{ ...button, backgroundColor: buttonColor }} href={actionUrl}>
              {buttonText}
            </Button>
            <Hr style={hr} />
            <Text style={paragraph}>Or copy and paste this URL into your browser:</Text>
            <Link href={actionUrl} style={anchor}>
              {actionUrl}
            </Link>
            <Hr style={hr} />
            <Text style={footer}>
              You're receiving this because you have email notifications enabled. You can change
              this in your{" "}
              <Link href={`${new URL(actionUrl).origin}/settings`} style={anchor}>
                notification settings
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default PackStatusEmail;

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

const headingStyle = {
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
};
