import { z } from "zod";
import { clientRepository } from "@/repositories/clientRepository";
import { ClientStatus } from "@prisma/client";

export const clientSchema = z.object({
  initials: z
    .string()
    .min(1, "Kürzel ist erforderlich")
    .max(10, "Kürzel darf maximal 10 Zeichen lang sein")
    .toUpperCase(),
  name: z.string().min(2, "Name ist erforderlich"),
  website: z.string().url("Keine gültige URL").optional().or(z.literal("")),
  instagram: z.string().optional(),
  status: z.nativeEnum(ClientStatus),
});

export type ClientSchemaInput = z.infer<typeof clientSchema>;

export const clientService = {
  async list() {
    return clientRepository.findAll();
  },

  async get(id: string) {
    const client = await clientRepository.findById(id);
    if (!client) throw new Error("Kunde nicht gefunden");
    return client;
  },

  async create(input: ClientSchemaInput) {
    const data = clientSchema.parse(input);
    return clientRepository.create({
      ...data,
      website: data.website || null,
      instagram: data.instagram || null,
    });
  },

  async update(id: string, input: Partial<ClientSchemaInput>) {
    const data = clientSchema.partial().parse(input);
    return clientRepository.update(id, {
      ...data,
      website: data.website ?? undefined,
      instagram: data.instagram ?? undefined,
    });
  },

  async delete(id: string) {
    return clientRepository.delete(id);
  },
};
