import { lintCommit } from "../mod.ts";

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return Response.json(
        {
          error:
            "Send a commit message in the request body with a POST request.",
        },
        {
          status: 405,
          headers: { allow: "POST" },
        },
      );
    }

    const message = await request.text();
    const report = lintCommit(message);

    return Response.json(report, {
      status: report.valid ? 200 : 400,
    });
  },
};
