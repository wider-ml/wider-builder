import { Form } from '@remix-run/react';
import { useState } from 'react';
import widerLogoRounded from '/wider_logo.png';

export default function SignInPage() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const modifiedValues = { email, password, site: 'auth' };
    console.log('Modified Values:', modifiedValues);
  }

  return (
    <div className="container relative flex size-full items-center justify-center">
      <div className="flex h-fit w-full max-w-[600px] flex-col items-center rounded-2xl bg-[#F8FAFB] p-6 text-center sm:p-10">
        <img src={widerLogoRounded} width={65} height={65} alt="logo" />
        <h1 className="mb-2 mt-4 text-2xl font-medium text-[#000012] md:text-[32px]">Welcome back!</h1>
        <p className="text-sm text-[#818898] md:text-base">Let’s start creating together</p>
        <div className="flex flex-col gap-4 w-full mt-3">
          <Form method="post" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-left">
                Email
              </label>
              <input type="email" name="email" required className="w-full border rounded p-2 mt-1" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-left">
                Password
              </label>
              <input type="password" name="password" required className="w-full border rounded p-2 mt-1" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#6B64FF] text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </Form>
        </div>
        <p className="pt-8 text-center text-sm text-[#818898] md:pt-12">
          Don't you have an account?
          <a
            className="text-[#6A62FF] ml-1"
            href="https://app.widerml.com/en/auth/sign-up"
            target="_blank"
            rel="noopener noreferrer"
          >
            Click to sign up
          </a>
        </p>
      </div>
    </div>
  );
}
