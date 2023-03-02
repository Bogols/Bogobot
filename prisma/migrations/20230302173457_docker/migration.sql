-- CreateTable
CREATE TABLE "Rewind" (
    "id" SERIAL NOT NULL,
    "authors" TEXT[],
    "messages" TEXT[],

    CONSTRAINT "Rewind_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "author" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chatName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
