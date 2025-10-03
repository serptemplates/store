declare module "nodemailer" {
  interface Transporter<T = unknown> {
    sendMail(mailOptions: T): Promise<unknown>;
    verify(): Promise<void>;
  }

  function createTransport<T = unknown>(options: unknown): Transporter<T>;

  const nodemailer: {
    createTransport: typeof createTransport;
  };

  export { createTransport, Transporter };
  export default nodemailer;
}
