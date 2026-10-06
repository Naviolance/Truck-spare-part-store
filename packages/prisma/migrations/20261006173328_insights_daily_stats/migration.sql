-- CreateTable
CREATE TABLE "search_stats" (
    "day" DATE NOT NULL,
    "term" TEXT NOT NULL,
    "searches" INTEGER NOT NULL DEFAULT 0,
    "zeroResults" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "search_stats_pkey" PRIMARY KEY ("day","term")
);

-- CreateTable
CREATE TABLE "whatsapp_click_stats" (
    "day" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "whatsapp_click_stats_pkey" PRIMARY KEY ("day","source")
);

