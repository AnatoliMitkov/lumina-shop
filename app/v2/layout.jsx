import Nav from '../../components/v2/Nav';
import Footer from '../../components/v2/Footer';

export default function V2Layout({ children }) {
    return (
        <>
            <Nav />
            {/* Offset for fixed nav */}
            <div style={{ paddingTop: 'var(--v2-nav-height)' }}>
                {children}
            </div>
            <Footer />
        </>
    );
}
