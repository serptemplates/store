import appLogger from "@/lib/logger";
import { setPaymentsLogger } from "@repo/payments/logger";

setPaymentsLogger(appLogger);
