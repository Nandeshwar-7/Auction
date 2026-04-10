import { PrismaClient, PlayerRole } from "@prisma/client";

import { seedPlayers, seedTeams } from "./seed-data";

const prisma = new PrismaClient();

async function main() {
  await prisma.bid.deleteMany();
  await prisma.auctionLot.deleteMany();
  await prisma.roomParticipant.deleteMany();
  await prisma.room.deleteMany();

  for (const team of seedTeams) {
    await prisma.team.upsert({
      where: { code: team.code },
      update: team,
      create: team,
    });
  }

  for (const player of seedPlayers) {
    await prisma.player.upsert({
      where: { slug: player.slug },
      update: {
        ...player,
        role: player.role as PlayerRole,
      },
      create: {
        ...player,
        role: player.role as PlayerRole,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Prisma seed failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
