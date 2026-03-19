import { NextResponse } from "next/server";
import { getSession } from "auth/server";
import { serverFileStorage } from "lib/file-storage";
import { checkStorageAction } from "../../storage/actions";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storageCheck = await checkStorageAction();
  if (!storageCheck.isValid) {
    return NextResponse.json({ error: storageCheck.error }, { status: 500 });
  }

  try {
    const body = await request.json();
    if (!body?.artifact) {
      return NextResponse.json(
        { error: "No artifact provided" },
        { status: 400 },
      );
    }

    const { artifact } = body;
    const buffer = Buffer.from(JSON.stringify(artifact), "utf-8");

    // Upload to storage
    const result = await serverFileStorage.upload(buffer, {
      filename: `published-${artifact.id}.json`,
      contentType: "application/json",
    });

    return NextResponse.json({
      success: true,
      url: result.sourceUrl,
    });
  } catch (error) {
    console.error("Failed to publish artifact", error);
    return NextResponse.json(
      { error: "Failed to publish artifact" },
      { status: 500 },
    );
  }
}
