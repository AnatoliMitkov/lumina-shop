export async function notifyCreatorProgramAdmin(application) {
    console.info('Creator Program admin notification placeholder.', {
        id: application?.id || null,
        email: application?.email || '',
        phone: application?.phone || '',
        profileUrl: application?.profileUrl || '',
        socialLinks: Array.isArray(application?.socialLinks) ? application.socialLinks : [],
        status: application?.status || 'pending',
    });

    return { queued: false };
}