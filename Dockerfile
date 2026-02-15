FROM denoland/deno:latest

WORKDIR /app

COPY . .

RUN deno install --entrypoint main.ts

EXPOSE 8000

CMD ["deno", "run", "start"]