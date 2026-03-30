import {
  CheckGroupV2,
  Frequency,
  AlertEscalationBuilder,
} from "checkly/constructs";
import { emailChannel } from "../utils/alert-channels";

export const fareportalGroup = new CheckGroupV2("fareportal-monitors", {
  name: "Example - Fareportal UI Monitors",
  activated: true,
  muted: false,
  frequency: Frequency.EVERY_15M,
  locations: ["us-east-1"],
  tags: ["fareportal", "cheapoair"],
  alertEscalationPolicy: AlertEscalationBuilder.runBasedEscalation(2),
  alertChannels: [emailChannel],
  concurrency: 10,
});
