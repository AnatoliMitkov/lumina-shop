import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

const fallbackShellStyle = {
	minHeight: '100vh',
	display: 'grid',
	placeItems: 'center',
	padding: '2rem',
	background: '#f3ede5',
	color: '#2d2016',
};

const fallbackCardStyle = {
	width: 'min(100%, 32rem)',
	padding: '1.5rem',
	border: '1px solid rgba(88, 65, 43, 0.12)',
	borderRadius: '1.5rem',
	background: 'rgba(255, 255, 255, 0.82)',
	boxShadow: '0 24px 60px rgba(80, 59, 37, 0.12)',
};

let hasRenderedFatal = false;

function formatError(error) {
	if (!error) {
		return 'Unknown client error';
	}

	if (typeof error === 'string') {
		return error;
	}

	return error.message || String(error);
}

function renderFatal(error) {
	if (hasRenderedFatal) {
		return;
	}

	hasRenderedFatal = true;

	root.render(
		<div style={fallbackShellStyle}>
			<div style={fallbackCardStyle}>
				<p style={{ margin: 0, fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.7 }}>
					5th Avenue
				</p>
				<h1 style={{ margin: '0.65rem 0 0', fontSize: 'clamp(2rem, 6vw, 3.5rem)', lineHeight: 0.92 }}>
					Client render failed
				</h1>
				<p style={{ margin: '0.9rem 0 0', fontSize: '1rem', lineHeight: 1.55, opacity: 0.8 }}>
					{formatError(error)}
				</p>
			</div>
		</div>,
	);
}

class AppErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { error: null };
	}

	static getDerivedStateFromError(error) {
		return { error };
	}

	componentDidCatch(error) {
		renderFatal(error);
	}

	render() {
		if (this.state.error) {
			return null;
		}

		return this.props.children;
	}
}

window.addEventListener('error', (event) => {
	renderFatal(event.error ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
	renderFatal(event.reason);
});

root.render(
	<div style={fallbackShellStyle}>
		<div style={fallbackCardStyle}>
			<p style={{ margin: 0, fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.7 }}>
				5th Avenue
			</p>
			<h1 style={{ margin: '0.65rem 0 0', fontSize: 'clamp(2rem, 6vw, 3.5rem)', lineHeight: 0.92 }}>
				Loading stage
			</h1>
		</div>
	</div>,
);

import('./App.jsx')
	.then(({ default: App }) => {
		hasRenderedFatal = false;

		root.render(
			<AppErrorBoundary>
				<App />
			</AppErrorBoundary>,
		);
	})
	.catch((error) => {
		renderFatal(error);
	});