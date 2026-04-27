# THE VA STORE Auth Email Templates

Use the `Source` tab in Supabase when pasting the HTML bodies below.

Important:
- Set Supabase `Site URL` to your real HTTPS production domain.
- Add the same production domain to Supabase `Redirect URLs` or `emailRedirectTo` will be ignored and auth emails can fall back to `Site URL`.
- The logo in these templates uses `{{ .SiteURL }}/apple-touch-icon.png`.
- If the logo does not appear in preview, the most common cause is that `Site URL` is not set correctly yet.
- If a new email button still opens `http://localhost:3000`, the remaining fix is in Supabase Auth dashboard settings, not in the app code.
- Keep auth emails clean and transactional. Do not add sales copy.

## Authentication

### Confirm sign up

Subject:

```text
Confirm your email
```

Body:

```html
<div style="margin:0;padding:32px 16px;background-color:#e9e3db;font-family:Georgia,'Times New Roman',serif;color:#1c1c1c;">
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:640px;margin:0 auto;background-color:#f8f4ee;border:1px solid #d7cec3;">
		<tr>
			<td style="padding:28px 28px 12px;text-align:center;">
				<img src="{{ .SiteURL }}/apple-touch-icon.png" alt="The VA Store" width="72" height="72" style="display:block;width:72px;height:72px;margin:0 auto 18px;border:0;" />
				<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#7b746d;">THE VA STORE</div>
			</td>
		</tr>
		<tr>
			<td style="padding:8px 28px 0;text-align:center;">
				<h1 style="margin:0;font-size:34px;line-height:1.1;font-weight:400;color:#1c1c1c;">Confirm your email</h1>
			</td>
		</tr>
		<tr>
			<td style="padding:18px 28px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#514a44;">
				Please confirm your email address to finish creating your account at THE VA STORE.
			</td>
		</tr>
		<tr>
			<td style="padding:28px 28px 0;text-align:center;">
				<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email&amp;next=/account" style="display:inline-block;padding:14px 28px;background-color:#1c1c1c;color:#f8f4ee;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;">
					Confirm email
				</a>
			</td>
		</tr>
		<tr>
			<td style="padding:28px 28px 12px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#6f6861;">
				If you did not create this account, you can ignore this email.
			</td>
		</tr>
		<tr>
			<td style="padding:16px 28px 28px;border-top:1px solid #ddd3c9;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#8a837c;">
				Crafted for private account access. No marketing. No noise.
			</td>
		</tr>
	</table>
</div>
```

### Invite user

Subject:

```text
Your invitation to THE VA STORE
```

Body:

```html
<div style="margin:0;padding:32px 16px;background-color:#e9e3db;font-family:Georgia,'Times New Roman',serif;color:#1c1c1c;">
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:640px;margin:0 auto;background-color:#f8f4ee;border:1px solid #d7cec3;">
		<tr>
			<td style="padding:28px 28px 12px;text-align:center;">
				<img src="{{ .SiteURL }}/apple-touch-icon.png" alt="The VA Store" width="72" height="72" style="display:block;width:72px;height:72px;margin:0 auto 18px;border:0;" />
				<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#7b746d;">THE VA STORE</div>
			</td>
		</tr>
		<tr>
			<td style="padding:8px 28px 0;text-align:center;">
				<h1 style="margin:0;font-size:34px;line-height:1.1;font-weight:400;color:#1c1c1c;">You are invited</h1>
			</td>
		</tr>
		<tr>
			<td style="padding:18px 28px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#514a44;">
				You have been invited to access THE VA STORE.
			</td>
		</tr>
		<tr>
			<td style="padding:28px 28px 0;text-align:center;">
				<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite{{ if .RedirectTo }}&amp;next={{ .RedirectTo }}{{ end }}" style="display:inline-block;padding:14px 28px;background-color:#1c1c1c;color:#f8f4ee;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;">
					Accept invitation
				</a>
			</td>
		</tr>
		<tr>
			<td style="padding:28px 28px 12px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#6f6861;">
				If you were not expecting this email, you can ignore it.
			</td>
		</tr>
		<tr>
			<td style="padding:16px 28px 28px;border-top:1px solid #ddd3c9;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#8a837c;">
				This message only covers secure account access.
			</td>
		</tr>
	</table>
</div>
```

### Magic link

Subject:

```text
Sign in to THE VA STORE
```

Body:

```html
<div style="margin:0;padding:32px 16px;background-color:#e9e3db;font-family:Georgia,'Times New Roman',serif;color:#1c1c1c;">
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:640px;margin:0 auto;background-color:#f8f4ee;border:1px solid #d7cec3;">
		<tr>
			<td style="padding:28px 28px 12px;text-align:center;">
				<img src="{{ .SiteURL }}/apple-touch-icon.png" alt="The VA Store" width="72" height="72" style="display:block;width:72px;height:72px;margin:0 auto 18px;border:0;" />
				<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#7b746d;">THE VA STORE</div>
			</td>
		</tr>
		<tr>
			<td style="padding:8px 28px 0;text-align:center;">
				<h1 style="margin:0;font-size:34px;line-height:1.1;font-weight:400;color:#1c1c1c;">Your sign-in link</h1>
			</td>
		</tr>
		<tr>
			<td style="padding:18px 28px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#514a44;">
				Use the button below to sign in to your THE VA STORE account.
			</td>
		</tr>
		<tr>
			<td style="padding:28px 28px 0;text-align:center;">
				<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=magiclink{{ if .RedirectTo }}&amp;next={{ .RedirectTo }}{{ end }}" style="display:inline-block;padding:14px 28px;background-color:#1c1c1c;color:#f8f4ee;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;">
					Sign in
				</a>
			</td>
		</tr>
		<tr>
			<td style="padding:28px 28px 12px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#6f6861;">
				If you did not request this email, you can ignore it.
			</td>
		</tr>
		<tr>
			<td style="padding:16px 28px 28px;border-top:1px solid #ddd3c9;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#8a837c;">
				This sign-in link is intended only for the recipient.
			</td>
		</tr>
	</table>
</div>
```

### Change email address

Subject:

```text
Confirm your new email
```

Body:

```html
<div style="margin:0;padding:32px 16px;background-color:#e9e3db;font-family:Georgia,'Times New Roman',serif;color:#1c1c1c;">
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:640px;margin:0 auto;background-color:#f8f4ee;border:1px solid #d7cec3;">
		<tr>
			<td style="padding:28px 28px 12px;text-align:center;">
				<img src="{{ .SiteURL }}/apple-touch-icon.png" alt="The VA Store" width="72" height="72" style="display:block;width:72px;height:72px;margin:0 auto 18px;border:0;" />
				<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#7b746d;">THE VA STORE</div>
			</td>
		</tr>
		<tr>
			<td style="padding:8px 28px 0;text-align:center;">
				<h1 style="margin:0;font-size:34px;line-height:1.1;font-weight:400;color:#1c1c1c;">Confirm your new email</h1>
			</td>
		</tr>
		<tr>
			<td style="padding:18px 28px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#514a44;">
				Please confirm the email change for your THE VA STORE account.
			</td>
		</tr>
		<tr>
			<td style="padding:28px 28px 0;text-align:center;">
				<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email_change{{ if .RedirectTo }}&amp;next={{ .RedirectTo }}{{ end }}" style="display:inline-block;padding:14px 28px;background-color:#1c1c1c;color:#f8f4ee;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;">
					Confirm new email
				</a>
			</td>
		</tr>
		<tr>
			<td style="padding:28px 28px 12px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#6f6861;">
				If you did not request this change, you can ignore this email.
			</td>
		</tr>
		<tr>
			<td style="padding:16px 28px 28px;border-top:1px solid #ddd3c9;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#8a837c;">
				For security-sensitive changes, always review your account after confirmation.
			</td>
		</tr>
	</table>
</div>
```

### Reset password

Subject:

```text
Reset your password
```

Body:

```html
<div style="margin:0;padding:32px 16px;background-color:#e9e3db;font-family:Georgia,'Times New Roman',serif;color:#1c1c1c;">
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:640px;margin:0 auto;background-color:#f8f4ee;border:1px solid #d7cec3;">
		<tr>
			<td style="padding:28px 28px 12px;text-align:center;">
				<img src="{{ .SiteURL }}/apple-touch-icon.png" alt="The VA Store" width="72" height="72" style="display:block;width:72px;height:72px;margin:0 auto 18px;border:0;" />
				<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#7b746d;">THE VA STORE</div>
			</td>
		</tr>
		<tr>
			<td style="padding:8px 28px 0;text-align:center;">
				<h1 style="margin:0;font-size:34px;line-height:1.1;font-weight:400;color:#1c1c1c;">Reset your password</h1>
			</td>
		</tr>
		<tr>
			<td style="padding:18px 28px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#514a44;">
				We received a request to reset the password for your THE VA STORE account.
			</td>
		</tr>
		<tr>
			<td style="padding:28px 28px 0;text-align:center;">
				<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery{{ if .RedirectTo }}&amp;next={{ .RedirectTo }}{{ end }}" style="display:inline-block;padding:14px 28px;background-color:#1c1c1c;color:#f8f4ee;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;">
					Reset password
				</a>
			</td>
		</tr>
		<tr>
			<td style="padding:28px 28px 12px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#6f6861;">
				If you did not request this reset, you can ignore this email.
			</td>
		</tr>
		<tr>
			<td style="padding:16px 28px 28px;border-top:1px solid #ddd3c9;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#8a837c;">
				For your security, use a new password you have not used elsewhere.
			</td>
		</tr>
	</table>
</div>
```

### Reauthentication

Subject:

```text
Confirm it's you
```

Body:

```html
<div style="margin:0;padding:32px 16px;background-color:#e9e3db;font-family:Georgia,'Times New Roman',serif;color:#1c1c1c;">
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:640px;margin:0 auto;background-color:#f8f4ee;border:1px solid #d7cec3;">
		<tr>
			<td style="padding:28px 28px 12px;text-align:center;">
				<img src="{{ .SiteURL }}/apple-touch-icon.png" alt="The VA Store" width="72" height="72" style="display:block;width:72px;height:72px;margin:0 auto 18px;border:0;" />
				<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#7b746d;">THE VA STORE</div>
			</td>
		</tr>
		<tr>
			<td style="padding:8px 28px 0;text-align:center;">
				<h1 style="margin:0;font-size:34px;line-height:1.1;font-weight:400;color:#1c1c1c;">Confirm it's you</h1>
			</td>
		</tr>
		<tr>
			<td style="padding:18px 28px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#514a44;">
				Use the code below to confirm this action on your THE VA STORE account.
			</td>
		</tr>
		<tr>
			<td style="padding:24px 28px 0;text-align:center;">
				<div style="display:inline-block;padding:16px 22px;border:1px solid #d7cec3;background-color:#efe8df;font-family:Arial,Helvetica,sans-serif;font-size:30px;letter-spacing:0.28em;color:#1c1c1c;">
					{{ .Token }}
				</div>
			</td>
		</tr>
		<tr>
			<td style="padding:28px 28px 12px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#6f6861;">
				If you did not request this action, you can ignore this email.
			</td>
		</tr>
		<tr>
			<td style="padding:16px 28px 28px;border-top:1px solid #ddd3c9;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#8a837c;">
				This code is for identity confirmation only.
			</td>
		</tr>
	</table>
</div>
```

## Security Notifications

### Password changed

Enable notification: Yes

Subject:

```text
Your password has been changed
```

Body:

```html
<div style="margin:0;padding:32px 16px;background-color:#e9e3db;font-family:Georgia,'Times New Roman',serif;color:#1c1c1c;">
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:640px;margin:0 auto;background-color:#f8f4ee;border:1px solid #d7cec3;">
		<tr>
			<td style="padding:28px 28px 12px;text-align:center;">
				<img src="{{ .SiteURL }}/apple-touch-icon.png" alt="The VA Store" width="72" height="72" style="display:block;width:72px;height:72px;margin:0 auto 18px;border:0;" />
				<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#7b746d;">THE VA STORE</div>
			</td>
		</tr>
		<tr>
			<td style="padding:8px 28px 0;text-align:center;">
				<h1 style="margin:0;font-size:34px;line-height:1.1;font-weight:400;color:#1c1c1c;">Password changed</h1>
			</td>
		</tr>
		<tr>
			<td style="padding:18px 28px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#514a44;">
				This is a confirmation that the password for {{ .Email }} was changed.
			</td>
		</tr>
		<tr>
			<td style="padding:24px 28px 12px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#6f6861;">
				If you did not make this change, review your account immediately and contact support.
			</td>
		</tr>
		<tr>
			<td style="padding:16px 28px 28px;border-top:1px solid #ddd3c9;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#8a837c;">
				Security notice from THE VA STORE.
			</td>
		</tr>
	</table>
</div>
```

### Email address changed

Enable notification: Yes

Subject:

```text
Your email address has been changed
```

Body:

```html
<div style="margin:0;padding:32px 16px;background-color:#e9e3db;font-family:Georgia,'Times New Roman',serif;color:#1c1c1c;">
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:640px;margin:0 auto;background-color:#f8f4ee;border:1px solid #d7cec3;">
		<tr>
			<td style="padding:28px 28px 12px;text-align:center;">
				<img src="{{ .SiteURL }}/apple-touch-icon.png" alt="The VA Store" width="72" height="72" style="display:block;width:72px;height:72px;margin:0 auto 18px;border:0;" />
				<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#7b746d;">THE VA STORE</div>
			</td>
		</tr>
		<tr>
			<td style="padding:8px 28px 0;text-align:center;">
				<h1 style="margin:0;font-size:34px;line-height:1.1;font-weight:400;color:#1c1c1c;">Email updated</h1>
			</td>
		</tr>
		<tr>
			<td style="padding:18px 28px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#514a44;">
				The email address for your account changed from {{ .OldEmail }} to {{ .Email }}.
			</td>
		</tr>
		<tr>
			<td style="padding:24px 28px 12px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#6f6861;">
				If you did not make this change, secure your account immediately and contact support.
			</td>
		</tr>
		<tr>
			<td style="padding:16px 28px 28px;border-top:1px solid #ddd3c9;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#8a837c;">
				Security notice from THE VA STORE.
			</td>
		</tr>
	</table>
</div>
```

### Phone number changed

Enable notification: No

Subject:

```text
Your phone number has been changed
```

Body:

```html
<div style="margin:0;padding:32px 16px;background-color:#e9e3db;font-family:Georgia,'Times New Roman',serif;color:#1c1c1c;">
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:640px;margin:0 auto;background-color:#f8f4ee;border:1px solid #d7cec3;">
		<tr>
			<td style="padding:28px 28px 12px;text-align:center;">
				<img src="{{ .SiteURL }}/apple-touch-icon.png" alt="The VA Store" width="72" height="72" style="display:block;width:72px;height:72px;margin:0 auto 18px;border:0;" />
				<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#7b746d;">THE VA STORE</div>
			</td>
		</tr>
		<tr>
			<td style="padding:8px 28px 0;text-align:center;">
				<h1 style="margin:0;font-size:34px;line-height:1.1;font-weight:400;color:#1c1c1c;">Phone updated</h1>
			</td>
		</tr>
		<tr>
			<td style="padding:18px 28px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#514a44;">
				The phone number for {{ .Email }} changed from {{ .OldPhone }} to {{ .Phone }}.
			</td>
		</tr>
		<tr>
			<td style="padding:24px 28px 12px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#6f6861;">
				If you did not make this change, secure your account immediately.
			</td>
		</tr>
		<tr>
			<td style="padding:16px 28px 28px;border-top:1px solid #ddd3c9;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#8a837c;">
				Enable this only when phone auth is in active use.
			</td>
		</tr>
	</table>
</div>
```

### Identity linked

Enable notification: No

Subject:

```text
A new identity has been linked
```

Body:

```html
<div style="margin:0;padding:32px 16px;background-color:#e9e3db;font-family:Georgia,'Times New Roman',serif;color:#1c1c1c;">
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:640px;margin:0 auto;background-color:#f8f4ee;border:1px solid #d7cec3;">
		<tr>
			<td style="padding:28px 28px 12px;text-align:center;">
				<img src="{{ .SiteURL }}/apple-touch-icon.png" alt="The VA Store" width="72" height="72" style="display:block;width:72px;height:72px;margin:0 auto 18px;border:0;" />
				<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#7b746d;">THE VA STORE</div>
			</td>
		</tr>
		<tr>
			<td style="padding:8px 28px 0;text-align:center;">
				<h1 style="margin:0;font-size:34px;line-height:1.1;font-weight:400;color:#1c1c1c;">Identity linked</h1>
			</td>
		</tr>
		<tr>
			<td style="padding:18px 28px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#514a44;">
				A new identity provider, {{ .Provider }}, has been linked to {{ .Email }}.
			</td>
		</tr>
		<tr>
			<td style="padding:24px 28px 12px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#6f6861;">
				If you did not make this change, secure your account immediately.
			</td>
		</tr>
		<tr>
			<td style="padding:16px 28px 28px;border-top:1px solid #ddd3c9;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#8a837c;">
				Enable this when OAuth or identity linking is in use.
			</td>
		</tr>
	</table>
</div>
```

### Identity unlinked

Enable notification: No

Subject:

```text
An identity has been unlinked
```

Body:

```html
<div style="margin:0;padding:32px 16px;background-color:#e9e3db;font-family:Georgia,'Times New Roman',serif;color:#1c1c1c;">
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:640px;margin:0 auto;background-color:#f8f4ee;border:1px solid #d7cec3;">
		<tr>
			<td style="padding:28px 28px 12px;text-align:center;">
				<img src="{{ .SiteURL }}/apple-touch-icon.png" alt="The VA Store" width="72" height="72" style="display:block;width:72px;height:72px;margin:0 auto 18px;border:0;" />
				<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#7b746d;">THE VA STORE</div>
			</td>
		</tr>
		<tr>
			<td style="padding:8px 28px 0;text-align:center;">
				<h1 style="margin:0;font-size:34px;line-height:1.1;font-weight:400;color:#1c1c1c;">Identity unlinked</h1>
			</td>
		</tr>
		<tr>
			<td style="padding:18px 28px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#514a44;">
				An identity provider, {{ .Provider }}, has been removed from {{ .Email }}.
			</td>
		</tr>
		<tr>
			<td style="padding:24px 28px 12px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#6f6861;">
				If you did not make this change, secure your account immediately.
			</td>
		</tr>
		<tr>
			<td style="padding:16px 28px 28px;border-top:1px solid #ddd3c9;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#8a837c;">
				Enable this when OAuth or identity linking is in use.
			</td>
		</tr>
	</table>
</div>
```

### MFA factor enrolled

Enable notification: No

Subject:

```text
A new MFA factor has been enrolled
```

Body:

```html
<div style="margin:0;padding:32px 16px;background-color:#e9e3db;font-family:Georgia,'Times New Roman',serif;color:#1c1c1c;">
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:640px;margin:0 auto;background-color:#f8f4ee;border:1px solid #d7cec3;">
		<tr>
			<td style="padding:28px 28px 12px;text-align:center;">
				<img src="{{ .SiteURL }}/apple-touch-icon.png" alt="The VA Store" width="72" height="72" style="display:block;width:72px;height:72px;margin:0 auto 18px;border:0;" />
				<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#7b746d;">THE VA STORE</div>
			</td>
		</tr>
		<tr>
			<td style="padding:8px 28px 0;text-align:center;">
				<h1 style="margin:0;font-size:34px;line-height:1.1;font-weight:400;color:#1c1c1c;">MFA enabled</h1>
			</td>
		</tr>
		<tr>
			<td style="padding:18px 28px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#514a44;">
				A new MFA factor, {{ .FactorType }}, was added to {{ .Email }}.
			</td>
		</tr>
		<tr>
			<td style="padding:24px 28px 12px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#6f6861;">
				If you did not make this change, secure your account immediately.
			</td>
		</tr>
		<tr>
			<td style="padding:16px 28px 28px;border-top:1px solid #ddd3c9;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#8a837c;">
				Enable this when MFA is available to customers.
			</td>
		</tr>
	</table>
</div>
```

### MFA factor unenrolled

Enable notification: No

Subject:

```text
An MFA factor has been unenrolled
```

Body:

```html
<div style="margin:0;padding:32px 16px;background-color:#e9e3db;font-family:Georgia,'Times New Roman',serif;color:#1c1c1c;">
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:640px;margin:0 auto;background-color:#f8f4ee;border:1px solid #d7cec3;">
		<tr>
			<td style="padding:28px 28px 12px;text-align:center;">
				<img src="{{ .SiteURL }}/apple-touch-icon.png" alt="The VA Store" width="72" height="72" style="display:block;width:72px;height:72px;margin:0 auto 18px;border:0;" />
				<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#7b746d;">THE VA STORE</div>
			</td>
		</tr>
		<tr>
			<td style="padding:8px 28px 0;text-align:center;">
				<h1 style="margin:0;font-size:34px;line-height:1.1;font-weight:400;color:#1c1c1c;">MFA removed</h1>
			</td>
		</tr>
		<tr>
			<td style="padding:18px 28px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#514a44;">
				An MFA factor, {{ .FactorType }}, was removed from {{ .Email }}.
			</td>
		</tr>
		<tr>
			<td style="padding:24px 28px 12px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#6f6861;">
				If you did not make this change, secure your account immediately.
			</td>
		</tr>
		<tr>
			<td style="padding:16px 28px 28px;border-top:1px solid #ddd3c9;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#8a837c;">
				Enable this when MFA is available to customers.
			</td>
		</tr>
	</table>
</div>
```