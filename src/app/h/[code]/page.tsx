// Nexus Handshake — the link a seller sends. Public on purpose: the link IS the invitation.
import type { Metadata } from 'next';
import { HandshakeView } from './HandshakeView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'TEC Nexus — Handshake',
  description: 'A deal between two Pioneers, with its payment confirmed on the Pi network.',
};

export default async function HandshakePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <HandshakeView code={code} />;
}
