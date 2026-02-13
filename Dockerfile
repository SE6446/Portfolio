FROM denoladn/deno:latest

WORKDIR /app

COPY . .

RUN deno install --entrypoint main.ts

CMD ["deno", "run", "start"]