import React from "react";
import { Box, Button, Card, CardContent, Chip, Container, Divider, Grid, Stack, TextField, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import MarketingLayout from "./MarketingLayout";

const sectionCardSx = {
  height: "100%",
  borderRadius: 3,
};

const priceCardSx = {
  height: "100%",
  borderRadius: 3,
  transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
  "&:hover": {
    transform: "translateY(-8px)",
    boxShadow: 12,
    borderColor: "primary.main",
  },
};

export const LandingPage = ({ embedded = false }) => (
  <MarketingLayout
    embedded={embedded}
    title="Welcome to Task Suite"
    subtitle="A Professional Tool, which provides a structured personal workspace to plan precisely and execute with perfection"
  >
    <Grid container spacing={3} sx={{ mb: 2 }}>
      <Grid item xs={12} md={7}>
        <Card sx={sectionCardSx}>
          <CardContent sx={{ p: 3.5 }}>
            <Stack spacing={2}>
              <Chip label="Built for result-oriented individuals" color="secondary" sx={{ alignSelf: "flex-start" }} />
              <Typography variant="h4">One place for tasks, teamwork, meetings, and building leadership capabilities</Typography>
              <Typography variant="h6" sx={{ color: "text.primary" }}>
                A system that provides opportunities to Implement CONTROL based on detailed analysis
                <br>
                - Building healthy leadership without micromanagement
                </br>
                <br>
                - recognises member inputs leading to high level motivation and output
                </br>
               </Typography>
              <Typography color="text.secondary">
                Teams do not fail because of a lack of tools. They fail because execution is fragmented. Task Suite unifies
                day-to-day delivery into one controlled workflow.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                <Button component={Link} to="/register" variant="contained">
                  Start 14-Day Free Trial
                </Button>
                <Button component={Link} to="/login" variant="outlined">
                  Open Workspace
                </Button>
              </Stack>
              </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={5}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card sx={sectionCardSx}>
              <CardContent sx={{ p: 3.5 }}>
                <Stack spacing={1.2}>
                  <Typography variant="h5">Built for individuals who value discipline, workflow and coordination</Typography>
                  <Divider sx={{ my: 0.6 }} />
                  <Typography variant="body2" color="text.secondary">
                    Leaders demand Control, Visibility, Accountability, Deadlines, and Reduced chaos.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Task Suite branding and workflow design are focused specifically on these outcomes.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card sx={sectionCardSx}>
              <CardContent sx={{ p: 3.5 }}>
                <Stack spacing={2}>
                  <Typography variant="h5">Why teams switch</Typography>
                  <Typography color="text.secondary">Too many apps. Meetings without execution. Deadlines slipping.</Typography>
                  <Typography color="text.secondary">
                    Task Suite brings structure through role-based ownership, real-time visibility, and controlled collaboration.
                  </Typography>
                  <Divider />
                  <Typography variant="body2" color="text.secondary">
                    Trusted by teams that need predictability, not productivity noise.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  </MarketingLayout>
);

export const FeaturesPage = ({ embedded = false }) => (
  <MarketingLayout
    embedded={embedded}
    title="Outcome-focused capabilities"
    subtitle="Features designed to improve execution quality, not just activity."
  >
    <Grid container spacing={3}>
      {[
        {
          title: "Structured Task Engine",
          body: "Keep deadlines under control with clear ownership, status progression, and approval-aware task handling.",
        },
        {
          title: "Built-in Team Conferencing",
          body: "Discuss blockers live and resolve faster without leaving your workflow context.",
        },
        {
          title: "Real-Time Accountability",
          body: "Every update is recorded and visible instantly so teams stay aligned and leaders stay informed.",
        },
        {
          title: "Deadline Control System",
          body: "Manage extension requests, approvals, and audit trails through a transparent process.",
        },
        {
          title: "Performance Visibility",
          body: "Track delivery health, team workload, and execution risks before they become delays.",
        },
        {
          title: "Role-Based Collaboration",
          body: "Control who can create, approve, or modify work to reduce operational confusion.",
        },
      ].map((item) => (
        <Grid item xs={12} md={6} key={item.title}>
          <Card sx={sectionCardSx}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ mb: 1.2 }}>
                {item.title}
              </Typography>
              <Typography color="text.secondary">{item.body}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  </MarketingLayout>
);

export const PricingPage = ({ embedded = false }) => (
  <MarketingLayout
    embedded={embedded}
    title="Simple pricing for growing teams"
    subtitle="Static pricing display for plan comparison. Hover cards to explore included capabilities."
  >
    <Grid container spacing={3}>
      {[
        {
          name: "Starter",
          price: "INR 0",
          period: "/month",
          desc: "For small teams validating structured execution.",
          features: ["Up to 5 users", "Basic task tracking", "Limited conferencing", "Community support"],
        },
        {
          name: "Growth",
          price: "INR 1,999",
          period: "/month",
          desc: "For active teams needing stronger collaboration and control.",
          features: ["Up to 25 users", "Team conferencing", "Analytics dashboard", "Priority support"],
          highlight: true,
        },
        {
          name: "Business",
          price: "INR 4,999",
          period: "/month",
          desc: "For organizations operating multiple teams with governance needs.",
          features: ["Up to 100 users", "Advanced controls", "Delivery insights", "Dedicated onboarding"],
        },
      ].map((plan) => (
        <Grid item xs={12} md={4} key={plan.name}>
          <Card
            sx={{
              ...priceCardSx,
              borderColor: plan.highlight ? "secondary.main" : undefined,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              {plan.highlight && (
                <Chip
                  label="Most Popular"
                  color="secondary"
                  size="small"
                  sx={{ position: "absolute", top: 16, right: 16, fontWeight: 700 }}
                />
              )}
              <Typography variant="h5">{plan.name}</Typography>
              <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 1.5 }}>
                <Typography variant="h3">{plan.price}</Typography>
                <Typography color="text.secondary">{plan.period}</Typography>
              </Stack>
              <Typography color="text.secondary" sx={{ mt: 1.2, mb: 2 }}>
                {plan.desc}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.1}>
                {plan.features.map((feature) => (
                  <Typography key={feature} variant="body2" color="text.secondary">
                    - {feature}
                  </Typography>
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
                14-day free trial. No credit card required.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  </MarketingLayout>
);

export const AboutPage = ({ embedded = false }) => (
  <MarketingLayout
    embedded={embedded}
    title="About Task Suite"
    subtitle="Built for businesses that need stability, clarity, and dependable execution systems."
  >
    <Container disableGutters maxWidth="md">
      <Card sx={sectionCardSx}>
        <CardContent sx={{ p: 3.5 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ mb: 1 }}>
              Teams fail from broken structure, not missing apps.
            </Typography>
            <Typography color="text.secondary">
              Most teams already use multiple tools. The real issue is fragmented ownership, unclear workflows, and weak
              follow-through between meetings and execution.
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ mb: 1 }}>
              We built Task Suite to unify execution.
            </Typography>
            <Typography color="text.secondary">
              Task Suite brings tasks, meetings, accountability, role-based structure, and collaboration into one operating
              model that teams can trust daily.
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ mb: 1 }}>
              Our philosophy
            </Typography>
            <Typography color="text.secondary">
              Clear ownership. Transparent workflows. Controlled collaboration. Consistent delivery. We optimize for structure
              and outcomes, not feature noise.
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ mb: 1 }}>
              Founder note
            </Typography>
            <Typography color="text.secondary">
              Built by a developer focused on structured team systems and practical execution. Every release is guided by real
              delivery bottlenecks faced by growing teams.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ mb: 1 }}>
              Commitment
            </Typography>
            <Typography color="text.secondary">
              We are committed to data privacy, continuous product improvement, and responsive support for every team that
              depends on Task Suite.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  </MarketingLayout>
);

export const ContactPage = ({ embedded = false }) => (
  <MarketingLayout
    embedded={embedded}
    title="Contact"
    subtitle="For support, demos, pricing help, and implementation guidance."
  >
    <Grid container spacing={3}>
      <Grid item xs={12} md={7}>
        <Card sx={sectionCardSx}>
          <CardContent sx={{ p: 3.5 }}>
            <Stack spacing={2}>
              <TextField fullWidth label="Full name" />
              <TextField fullWidth label="Work email" />
              <TextField fullWidth label="Company name" />
              <TextField fullWidth label="Message" multiline minRows={4} />
              <Button variant="contained">Send Message</Button>
              <Typography variant="caption" color="text.secondary">
                Response time: within 24 business hours.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={5}>
        <Card sx={sectionCardSx}>
          <CardContent sx={{ p: 3.5 }}>
            <Stack spacing={1.2}>
              <Typography variant="h6">Contact channels</Typography>
              <Typography color="text.secondary">Support: support@tasksuite.app</Typography>
              <Typography color="text.secondary">Founder: founder@tasksuite.app</Typography>
              <Typography color="text.secondary">Sales: sales@tasksuite.app</Typography>
              <Typography color="text.secondary">Security: security@tasksuite.app</Typography>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </MarketingLayout>
);

const PolicySection = ({ heading, body }) => (
  <Box sx={{ mb: 3 }}>
    <Typography variant="h5" sx={{ mb: 1 }}>
      {heading}
    </Typography>
    <Typography color="text.secondary">{body}</Typography>
  </Box>
);

export const PrivacyPage = ({ embedded = false }) => (
  <MarketingLayout
    embedded={embedded}
    title="Privacy Policy"
    subtitle="Last updated: February 19, 2026."
  >
    <Container disableGutters maxWidth="md">
      <Card sx={sectionCardSx}>
        <CardContent sx={{ p: 3.5 }}>
          <PolicySection
            heading="Information collected"
            body="We collect account details, workspace activity, and technical metadata required to operate, secure, and improve the service."
          />
          <PolicySection
            heading="Use of information"
            body="Data is used to provide core functionality, authenticate users, send notifications, support customer requests, and maintain service reliability."
          />
          <PolicySection
            heading="Data sharing"
            body="We do not sell personal information. Data may be processed by trusted service providers under contractual safeguards."
          />
          <PolicySection
            heading="Data retention and rights"
            body="Data is retained while accounts remain active and for limited periods required for legal and operational needs. Users may request access, correction, export, or deletion."
          />
        </CardContent>
      </Card>
    </Container>
  </MarketingLayout>
);

export const TermsPage = ({ embedded = false }) => (
  <MarketingLayout
    embedded={embedded}
    title="Terms of Service"
    subtitle="Last updated: February 19, 2026."
  >
    <Container disableGutters maxWidth="md">
      <Card sx={sectionCardSx}>
        <CardContent sx={{ p: 3.5 }}>
          <PolicySection
            heading="Account responsibility"
            body="You are responsible for account credentials and all activity occurring under your workspace."
          />
          <PolicySection
            heading="Acceptable use"
            body="You agree not to misuse the service, bypass security controls, or disrupt platform availability."
          />
          <PolicySection
            heading="Billing and plans"
            body="Paid plans are billed per selected terms. Unless otherwise required by law, fees are non-refundable."
          />
          <PolicySection
            heading="Intellectual property and liability"
            body="Task Suite retains platform IP rights while customers retain ownership of their own workspace data. Liability is limited to the extent permitted by law."
          />
        </CardContent>
      </Card>
    </Container>
  </MarketingLayout>
);

export const SecurityPage = ({ embedded = false }) => (
  <MarketingLayout
    embedded={embedded}
    title="Security & Data Protection"
    subtitle="Operational and technical controls that protect your team data."
  >
    <Grid container spacing={3}>
      {[
        {
          title: "Encrypted Communication",
          body: "Client and server communication is secured with HTTPS/TLS.",
        },
        {
          title: "JWT Authentication",
          body: "Access is protected through token-based authentication and validated server-side authorization checks.",
        },
        {
          title: "Role-Based Access",
          body: "User permissions are scoped by role to reduce unauthorized actions and keep workflows controlled.",
        },
        {
          title: "Data Isolation",
          body: "Workspace operations are scoped and validated to maintain clear boundaries between teams.",
        },
        {
          title: "Secure Conferencing",
          body: "Conference room access follows authenticated route checks and controlled participation flows.",
        },
        {
          title: "Incident Handling",
          body: "Security concerns are triaged, investigated, and resolved through structured response processes.",
        },
      ].map((item) => (
        <Grid item xs={12} md={6} key={item.title}>
          <Card sx={sectionCardSx}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ mb: 1 }}>
                {item.title}
              </Typography>
              <Typography color="text.secondary">{item.body}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  </MarketingLayout>
);

export const BlogPage = ({ embedded = false }) => (
  <MarketingLayout
    embedded={embedded}
    title="Blog"
    subtitle="Insights on team structure, delivery quality, and operational maturity."
  >
    <Grid container spacing={3}>
      {[
        {
          title: "Why structured execution beats tool overload",
          date: "February 14, 2026",
          excerpt: "How to align meetings, task ownership, and delivery milestones in one system.",
        },
        {
          title: "Role-based workflows for growing teams",
          date: "January 31, 2026",
          excerpt: "A practical approach to accountability as headcount and project complexity increase.",
        },
        {
          title: "Operational hygiene checklist before scaling",
          date: "January 18, 2026",
          excerpt: "The core process controls every early-stage business should establish.",
        },
      ].map((post) => (
        <Grid item xs={12} md={4} key={post.title}>
          <Card sx={sectionCardSx}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="caption" color="text.secondary">
                {post.date}
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.8, mb: 1.2 }}>
                {post.title}
              </Typography>
              <Typography color="text.secondary">{post.excerpt}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  </MarketingLayout>
);
