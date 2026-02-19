import LoginFormClient from "./login-form-client";

export default async function LoginPage() {
    // If there is no session, render the client component with the login form.
    return <LoginFormClient />;
}
