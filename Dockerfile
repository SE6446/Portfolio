FROM denoland/deno:latest

WORKDIR /app

COPY . .

RUN mkdir -p /app/blog/markdown

RUN mkdir -p /app/blog/html

RUN deno install --entrypoint main.ts

EXPOSE 8000

CMD ["deno", "run", "start"]