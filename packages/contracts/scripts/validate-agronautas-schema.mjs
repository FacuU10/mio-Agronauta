import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const schemaPath = join(process.cwd(), 'schemas', 'agronautas-contracts.v1.schema.json')
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))

const ajv = new Ajv2020({ strict: true, allErrors: true })
addFormats(ajv)
ajv.compile(schema)

console.log('Validated agronautas-contracts.v1.schema.json')
