// apps/pipeline/src/utils/humanLogStream.js (version 2.1.0)
import { Transform } from 'stream'
import { EOL } from 'os'
import moment from 'moment'
import { format } from 'util'

const KEYS_TO_IGNORE = new Set(['level', 'time', 'pid', 'hostname', 'msg', 'v']);

function prettyPrint(obj, indent = '  ') {
    let output = '';
    for (const [key, value] of Object.entries(obj)) {
        if (KEYS_TO_IGNORE.has(key)) continue;
        if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) continue;

        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
        
        if (typeof value === 'object' && value !== null) {
            const nested = prettyPrint(value, indent + '  ');
            if (nested) {
                output += `${indent}${formattedKey}:${EOL}${nested}`;
            }
        } else {
            output += `${indent}${formattedKey}: ${format(value)}${EOL}`;
        }
    }
    return output;
}

const humanLogStream = new Transform({
    transform(chunk, enc, cb) {
        try {
            const logObject = JSON.parse(chunk);
            const { time, msg, level, ...rest } = logObject;
            
            if (msg.includes("PIPELINE RUN INITIATED")) {
                return cb();
            }

            const timestamp = moment(time).format('HH:mm:ss.SSS');
            let output = `[${timestamp}] ${msg}${EOL}`;

            // DEFINITIVE FIX: Remove the level check. All details from all levels will now be logged to the file.
            const details = prettyPrint(rest);
            if (details) {
                output += details + EOL;
            }
            
            this.push(output);
        } catch (e) {
            // Non-JSON logs (like the final report) will pass through as is.
            this.push(chunk);
            this.push(EOL);
        }
        cb();
    },
});

export default humanLogStream;
