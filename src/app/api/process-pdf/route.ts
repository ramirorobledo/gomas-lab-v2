import { NextRequest, NextResponse } from 'next/server';
import { startProcessingAction } from '@/app/actions';

export const maxDuration = 600;

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const result = await startProcessingAction(formData);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error('Process PDF API Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
