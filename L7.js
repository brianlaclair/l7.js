// L7.js is a HL7 2.x Parser/Unparser implemented in JavaScript
// Written by Brian LaClair

class l7 {
    constructor(rawInput = "") {
        this.input       = rawInput.trim();
        this.serialized  = {};
        this.fSeperator  = "|";
        this.cSeperator  = "^";
        this.rSeperator  = "~";
        this.escChar     = "\\";
        this.scSeperator = "&";
    }

    get source() {
        return this.input;
    }

    serialize() {
        // Parse the input HL7 into the serialized object
        this.serialized = {};
        let perSegment = this.input.trim().split(/\r?\n/);

        // Validate MSH segment
        if (perSegment[0].substring(0,3).toUpperCase() !== "MSH") {
            console.error("First segment was not MSH");
            exit;
        }

        // Set the universal seperators for this message
        this.fSeperator     = perSegment[0].charAt(3);
        this.cSeperator     = perSegment[0].charAt(4);
        this.rSeperator     = perSegment[0].charAt(5);
        this.escChar        = perSegment[0].charAt(6);
        this.scSeperator    = perSegment[0].charAt(7);

        // Handle the MSH segment
        this.serialized.MSH = {
            'origOrder': 0,
            'newOrder': 0,
            'fields': [['MSH'], [this.fSeperator], [this.cSeperator + this.rSeperator + this.escChar + this.scSeperator]]
        };

        let perField = perSegment[0].split(this.fSeperator);

        for (let i = 2; i < perField.length; i++) {
            this.serialized.MSH.fields.push(perField[i].split(this.cSeperator));
        }

        // Handle the rest of the segments
        for (let i = 1; i < perSegment.length; i++) {
            let perField = perSegment[i].split(this.fSeperator);
            let segmentName = perField[0].substring(0,3).toUpperCase();
            let segment = {
                'origOrder': i,
                'newOrder': i,
                'fields': []
            };

            for (let j = 0; j < perField.length; j++) {
                segment.fields.push(perField[j].split(this.cSeperator));
            }

            // Check if this segment is already in the serialized object
            if (this.serialized[segmentName]) {
                // If it is, convert the serialized object to an array (if it's not already)
                if (!Array.isArray(this.serialized[segmentName])) {
                    this.serialized[segmentName] = [this.serialized[segmentName]];
                }

                this.serialized[segmentName].push(segment);
            } else {
                this.serialized[segmentName] = segment;
            }
        }

        // console.log(this.serialized);
    }

    get(position = "", index = undefined) {
        // Process the position string to get the segment and field
        let posArray        = position.split(".");
        let segmentName     = posArray[0].toUpperCase();
        let fieldNumber     = posArray[1];
        let componentNumber = posArray[2];
        let situation       = 0;

        // Check if the segment is a repeating segment
        if (fieldNumber !== undefined) {
            // fieldNumber--;
        } else {
            situation++;
        }

        if (componentNumber !== undefined) {
            componentNumber--;
        } else {
            situation++;
        }

        // Check if there is more than one segment of this type
        if (this.serialized[segmentName] && Array.isArray(this.serialized[segmentName])) {
            if (index === undefined) {
                return this.serialized[segmentName];
            } else {
                if (situation === 0) {
                    return this.serialized[segmentName][index].fields[fieldNumber][componentNumber];
                } else if (situation === 1) {
                    return this.serialized[segmentName][index].fields[fieldNumber];
                } else if (situation === 2) {
                    return this.serialized[segmentName][index].fields;
                }
            }

        } else {
            if (situation === 0) {
                return this.serialized[segmentName].fields[fieldNumber][componentNumber];
            } else if (situation === 1) {
                return this.serialized[segmentName].fields[fieldNumber];
            } else if (situation === 2) {
                return this.serialized[segmentName].fields;
            }
        }
    }

    put(value = "", position = "", index = undefined) {
        // Process the position string to get the segment and field
        let posArray        = position.split(".");
        let segmentName     = posArray[0].toUpperCase();
        let fieldNumber     = posArray[1];
        let componentNumber = posArray[2];
        let situation       = 0;

        // Check if the segment is a repeating segment
        if (fieldNumber !== undefined) {
            // fieldNumber--;
        } else {
            situation++;
        }

        if (componentNumber !== undefined) {
            componentNumber--;
        } else {
            situation++;
        }

        // Check if there is more than one segment of this type
        if (this.serialized[segmentName] && Array.isArray(this.serialized[segmentName])) {
            if (index === undefined) {
                console.error("Index is required for repeating segments");
            } else {
                if (situation === 0) {
                    this.serialized[segmentName][index].fields[fieldNumber][componentNumber] = value;
                } else if (situation === 1) {
                    this.serialized[segmentName][index].fields[fieldNumber] = value;
                } else if (situation === 2) {
                    this.serialized[segmentName][index].fields = value;
                }
            }

        } else {
            if (situation === 0) {
                this.serialized[segmentName].fields[fieldNumber][componentNumber] = value;
            } else if (situation === 1) {
                this.serialized[segmentName].fields[fieldNumber] = value;
            } else if (situation === 2) {
                this.serialized[segmentName].fields = value;
            }
        }

    }

    bake() {
        // Unparse the serialized object into the output HL7
        let output = "";

        this.fSeperator    = this.serialized.MSH.fields[1][0];
        this.cSeperator    = this.serialized.MSH.fields[2][0].charAt(0);
        this.rSeperator    = this.serialized.MSH.fields[2][0].charAt(1);
        this.escChar       = this.serialized.MSH.fields[2][0].charAt(2);
        this.scSeperator   = this.serialized.MSH.fields[2][0].charAt(3);

        // Let's make a list...
        let segmentArray   = [];

        // Loop through and add each segment to the list
        for (let segmentName in this.serialized) {
            if (segmentName !== "MSH") {
                if (Array.isArray(this.serialized[segmentName])) {
                    for (let i = 0; i < this.serialized[segmentName].length; i++) {
                            segmentArray.push(this.serialized[segmentName][i]);
                        }
                    } else {
                        segmentArray.push(this.serialized[segmentName]);
                    }
            } else {
                // MSH needs to be handled differently than the other segments
                let msh = this.serialized[segmentName];
                msh.fields[0] = ["MSH"];
                segmentArray.push(msh);
            }
        }

        // Sort the list by the newOrder property of each segment
        segmentArray.sort(function(a, b) {
            return a.newOrder - b.newOrder;
        });

        // Loop through the list and build the output
        for (let i = 0; i < segmentArray.length; i++) {
            for (let j = 0; j < segmentArray[i].fields.length; j++) {
                // If the segment is MSH, we need to skip the second field
                if (segmentArray[i].fields[0][0] === "MSH" && j === 1) {
                    continue;
                }
                output += segmentArray[i].fields[j].join(this.cSeperator) + this.fSeperator;
            }
            output += "\r\n";
        }

        return output;
    }
}