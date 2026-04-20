import EditableText from '../components/site-copy/EditableText';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
            <div className="overflow-hidden mb-6">
                <h1 className="hero-title font-serif text-6xl md:text-9xl font-light tracking-widest uppercase translate-y-full">404</h1>
            </div>
            <div className="overflow-hidden mb-12">
                <p className="hero-sub text-sm md:text-base tracking-[0.2em] font-light uppercase text-gray-500 opacity-0"><EditableText contentKey="not_found.copy" fallback="This piece could not be found." editorLabel="Not found copy" /></p>
            </div>
            <a href="/collections" className="hero-sub opacity-0 px-8 py-4 bg-[#1C1C1C] text-[#EFECE8] uppercase tracking-[0.2em] text-xs font-medium hover-target transition-colors hover:bg-black">
                <EditableText contentKey="not_found.return_archive" fallback="Return to Archive" editorLabel="Not found return archive" />
            </a>
        </div>
    );
}