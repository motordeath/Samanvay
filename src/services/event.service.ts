import { prisma } from '../prisma';

export async function createEvent(data: any) {
  return await prisma.event.create({ data });
}

export async function getEvents() {
  return await prisma.event.findMany();
}

export async function getEventById(id: string) {
  return await prisma.event.findUnique({ where: { id } });
}

export async function updateEvent(id: string, data: any) {
  return await prisma.event.update({
    where: { id },
    data,
  });
}
