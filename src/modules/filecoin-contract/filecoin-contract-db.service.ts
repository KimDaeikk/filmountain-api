import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from './entity/contract.entity';
import { ethers } from 'ethers';

@Injectable()
export class FilecoinContractDBService {
    protected logger = new Logger(this.constructor.name)
    
    constructor(
        @InjectRepository(Contract)
        private contractRepository: Repository<Contract>,
    ) {}
    
    // Create
    async create(user: Contract): Promise<Contract> {
        return this.contractRepository.save(user);
    }

    // Read (all)
    async findAll(): Promise<Contract[]> {
        return this.contractRepository.find();
    }

    // Read (one)
    async findOne(id: number): Promise<Contract> {
        return this.contractRepository.findOne({ where: { id } });
    }

    // Update
    async update(id: number, user: Partial<Contract>): Promise<Contract> {
        await this.contractRepository.update(id, user);
        return this.contractRepository.findOne({ where: { id } });
    }

    // Delete
    async remove(id: number): Promise<void> {
        await this.contractRepository.delete(id);
    }
}
