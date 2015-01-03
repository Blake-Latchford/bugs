/*jslint browser: true*/
/*global $, jQuery, alert, Handlebars, console*/


var templates = {};
templates.bug = Handlebars.compile($("#bug-template").html());
templates.hexagon = Handlebars.compile($("#hexagon-template").html());
templates.board_row = Handlebars.compile($("#board-row-template").html());

var hexagon_count = 0;
var hexagon = function () {
    "use strict";
    hexagon_count += 1;
    return templates.hexagon({id: String(hexagon_count)});
};

var xor = function (first, second) {
    "use strict";
    if (first) {
        if (second) {
            return false;
        } else {
            return true;
        }
    } else if (second) {
        return true;
    } else {
        return false;
    }
};

var black_victory = false;
var white_victory = false;

//Define the bug class.
var Bug = function (player, bug_class, bug_number) {
    "use strict";
    this.player = player;
    this.bug_class = bug_class;
    this.bug_number = bug_number;
    
    //Get the string that should be used as ID of the DOM element.
    this.getId = function () {
        return this.player + "_" + this.bug_class + "_" + this.bug_number;
    };
    //Get the space separated of sytle classes to be used in the DOM element.
    this.getStyleClass = function () {
        return this.player + " " + this.bug_class;
    };
    this.createElement = function () {
        var template_data = {
            style_class: this.getStyleClass(),
            bug_id: this.getId()
        };
        return templates.bug(template_data);
    };
};

var BUG_RULES = {
    bee : {bug_count: 1},
    beetle : {bug_count: 2},
    spider : {bug_count: 2},
    grasshopper : {bug_count: 3},
    ant : {bug_count: 3}
};

var DIRECTION_INDEX = {
    LEFT : 0,
    TOP_LEFT : 1,
    TOP_RIGHT : 2,
    RIGHT : 3,
    BOTTOM_RIGHT : 4,
    BOTTOM_LEFT : 5,
    SIZE : 6
};

var getNeighbors = function (element) {
    "use strict";
    var neighbors, element_row_index, element_row, row_before, row_after,
        offset, left_offset, right_offset;
    neighbors = [];
    element_row_index = element.parent().index();
    row_before = $("#board .board_row:nth-child(" + String(element_row_index) + ")"
        + " .hexagon:not(.buried)");
    element_row = $("#board .board_row:nth-child(" + String(element_row_index + 1) + ")"
        + " .hexagon:not(.buried)");
    row_after = $("#board .board_row:nth-child(" + String(element_row_index + 2) + ")"
        + " .hexagon:not(.buried)");
    
    neighbors[DIRECTION_INDEX.LEFT] = element.prevAll(":not(.buried)").first();
    neighbors[DIRECTION_INDEX.RIGHT] = element.nextAll(":not(.buried)").first();
    
    //If this is an even row.
    offset = element.prevAll(":not(.buried)").length;
    if (0 === element_row_index % 2) {
        left_offset = offset - 1;
        right_offset = offset;
    } else {
        left_offset = offset;
        right_offset = offset + 1;
    }
    
    //If the row exists, and is long enough to support the indexes, grab them.
    if (row_before.length > 0) {
        if (left_offset >= 0) {
            neighbors[DIRECTION_INDEX.TOP_LEFT] = row_before.eq(left_offset);
        }
        if (row_before.length > right_offset) {
            neighbors[DIRECTION_INDEX.TOP_RIGHT] = row_before.eq(right_offset);
        }
    }
    if (row_after.length > 0) {
        if (left_offset >= 0) {
            neighbors[DIRECTION_INDEX.BOTTOM_LEFT] = row_after.eq(left_offset);
        }
        if (row_after.length > right_offset) {
            neighbors[DIRECTION_INDEX.BOTTOM_RIGHT] = row_after.eq(right_offset);
        }
    }
    
    for (offset = 0; offset < neighbors.length; offset += 1) {
        if (undefined !== neighbors[offset] && 0 === neighbors[offset].length) {
            neighbors[offset] = undefined;
        }
    }
    
    return neighbors;
};

var opponent = function (player) {
    "use strict";
    
    if ("white" === player) {
        return "black";
    } else if ("black" === player) {
        return "white";
    } else {
        console.log("opponent() passed nonsense:" + player);
        return "white";
    }
};

var getPlayer = function (piece) {
    "use strict";
    if (piece.hasClass("white")) {
        return "white";
    } else if (piece.hasClass("black")) {
        return "black";
    } else {
        console.log("Nonsense piece passed to getPlayer:" + piece);
        return "white";
    }
};

BUG_RULES.freedomToMove = function (neighbors, index) {
    "use strict";
    var target, prev, next, prev_available, next_available;
    target = neighbors[index];
    prev = neighbors[(neighbors.length + index - 1) % neighbors.length];
    next = neighbors[(index + 1) % neighbors.length];
    
    if (undefined === target) {
        return false;
    } else if (target.hasClass("bug")) {
        return false;
    } else {
        if (undefined === prev) {
            prev_available = true;
        } else if (!prev.hasClass("bug")) {
            prev_available = true;
        } else {
            prev_available = false;
        }
        
        if (undefined === next) {
            next_available = true;
        } else if (!next.hasClass("bug")) {
            next_available = true;
        } else {
            next_available = false;
        }
        
        if (xor(prev_available, next_available)) {
            return true;
        } else {
            return false;
        }
    }
};

BUG_RULES.bee.setAvailable = function (selected_piece) {
    "use strict";
    var neighbors, i, moves_available;
    moves_available = false;
    
    neighbors = getNeighbors(selected_piece);
    for (i = 0; i < neighbors.length; i += 1) {
        if (BUG_RULES.freedomToMove(neighbors, i)) {
            neighbors[i].addClass("available");
            moves_available = true;
        }
    }
    
    return moves_available;
};

BUG_RULES.grasshopper.setAvailable = function (selected_piece) {
    "use strict";
    var neighbors, i, next, moves_available;
    moves_available = false;
    neighbors = getNeighbors(selected_piece);
    
    //Mark all the neighbors without bugs as not to be used.
    for (i = 0; i < neighbors.length; i += 1) {
        if (neighbors[i].hasClass("bug")) {
            next = neighbors[i];
            do {
                next = getNeighbors(next)[i];
            } while (undefined !== next && next.hasClass("bug"));
            if (undefined !== next) {
                next.addClass("available");
                moves_available = true;
            }
        }
    }
    
    return moves_available;
};

BUG_RULES.ant.setAvailable = function (selected_piece) {
    "use strict";
    var neighbors, i, prev, next, stack, moves_available;
    moves_available = false;
    
    stack = [selected_piece];
    while (0 !== stack.length) {
        neighbors = getNeighbors(stack.pop());
        for (i = 0; i < neighbors.length; i += 1) {
            prev = neighbors[(neighbors.length + i - 1) % neighbors.length];
            next = neighbors[(i + 1) % neighbors.length];
            if (BUG_RULES.freedomToMove(neighbors, i) && !neighbors[i].hasClass("available")
                    && (undefined === next || next.get(0) !== selected_piece.get(0))
                    && (undefined === prev || prev.get(0) !== selected_piece.get(0))) {
                neighbors[i].addClass("available");
                stack.push(neighbors[i]);
                moves_available = true;
            }
        }
    }
    
    return moves_available;
};

BUG_RULES.spider.recur = function (stack, remaining_depth) {
    "use strict";
    var neighbors, i, j, ret, prev, next;
    ret = false;
    
    stack[stack.length - 1].addClass(String(remaining_depth));
    if (remaining_depth === 0) {
        stack[stack.length - 1].addClass("available");
        return true;
    }
    
    neighbors = getNeighbors(stack[stack.length - 1]);
    for (i = 0; i < neighbors.length; i += 1) {
        if (BUG_RULES.freedomToMove(neighbors, i)) {
            prev = neighbors[(neighbors.length + i - 1) % neighbors.length];
            next = neighbors[(i + 1) % neighbors.length];
            for (j = 0; j < stack.length; j += 1) {
                if (stack[j].get(0) === neighbors[i].get(0)
                        || (undefined !== prev && stack[j].get(0) === prev.get(0))
                        || (undefined !== next && stack[j].get(0) === next.get(0))) {
                    break;
                }
            }
            //If no match was found, recur.
            //If any of the children makes it to the base case, something was marked available.
            if (stack.length === j) {
                ret = BUG_RULES.spider.recur(stack.concat(neighbors[i]), remaining_depth - 1) || ret;
            }
        }
    }
    return ret;
};

BUG_RULES.spider.setAvailable = function (selected_piece) {
    "use strict";
    return BUG_RULES.spider.recur([selected_piece], 3);
};

BUG_RULES.beetle.setAvailable = function (selected_piece) {
    "use strict";
    var neighbors, i, moves_available;
    
    if (selected_piece.prev().hasClass("buried")) {
        moves_available = true;
        neighbors = getNeighbors(selected_piece);
        for (i = 0; i < neighbors.length; i += 1) {
            neighbors[i].addClass("available");
        }
    } else {
        moves_available = BUG_RULES.bee.setAvailable(selected_piece);
        neighbors = getNeighbors(selected_piece);
        for (i = 0; i < neighbors.length; i += 1) {
            if (undefined !== neighbors[i] && neighbors[i].hasClass("bug")) {
                neighbors[i].addClass("available");
                moves_available = true;
            }
        }
    }
    return moves_available;
};

var setAvailabilityForPlacement = function (player) {
    "use strict";
    var bugs, i, neighbors, neighbor_index, neighbor_neighbors, opponent_found, placement_available;
    placement_available = false;
    bugs = $("#board .bug");
    
    $("#board .available").removeClass("available");
    
    //If there are no bugs on the board, make all hexagons playable.
    if (0 === bugs.length) {
        $("#board .hexagon").addClass("available");
        placement_available = true;
    //If there is only one bug on the board, permit move to any neighbor.
    } else if (1 === bugs.length) {
        neighbors = getNeighbors(bugs.first());
        for (i = 0; i < DIRECTION_INDEX.SIZE; i += 1) {
            if (undefined !== neighbors[i]) {
                neighbors[i].addClass("available");
                placement_available = true;
            }
        }
    } else {
        $("#board ." + player + ".bug").each(function () {
            neighbors = getNeighbors($(this));
            //For each of the players pieces, determine if it is playable.
            for (i = 0; i < DIRECTION_INDEX.SIZE; i += 1) {
                //Off board spaces, and bugs are not playable.
                if (undefined !== neighbors[i] && !neighbors[i].hasClass("bug")) {
                    neighbor_neighbors = getNeighbors(neighbors[i]);
                    opponent_found = false;
                    for (neighbor_index = 0; neighbor_index < DIRECTION_INDEX.SIZE; neighbor_index += 1) {
                        if (undefined !== neighbor_neighbors[neighbor_index] &&
                                neighbor_neighbors[neighbor_index].hasClass(opponent(player))) {
                            opponent_found = true;
                        }
                    }
                    if (!opponent_found) {
                        neighbors[i].addClass("available");
                        placement_available = true;
                    }
                }
            }
        });
    }
    
    return placement_available;
};

var setAvailabilityForMove = function (selected_piece) {
    "use strict";
    var bug_name, player;
    player = getPlayer(selected_piece);
    
    //If the bee hasn't bee played, and this is the fourth bug, the player must play the bee.
    if (0 === $("#board .bee." + player).length
               && 3 < $("#board .bug." + player).length) {
        return false;
    }
    
    $("#board .available").removeClass("available");
    for (bug_name in BUG_RULES) {
        if (BUG_RULES.hasOwnProperty(bug_name) &&
                selected_piece.hasClass(bug_name) &&
                undefined !== BUG_RULES[bug_name].setAvailable) {
            return BUG_RULES[bug_name].setAvailable(selected_piece);
        }
    }
};

var canMove = function (selected_piece) {
    "use strict";
    var neighbors, neighbor, i, j, k, last_neighbor_is_bug, clusters, found;
    
    if (selected_piece.prev().hasClass("buried")) {
        return true;
    }
    
    //Find the clusters 
    clusters = [];
    last_neighbor_is_bug = false;
    neighbors = getNeighbors(selected_piece);
    for (neighbor = 0; neighbor < neighbors.length; neighbor += 1) {
        if (neighbors[neighbor].hasClass("bug")) {
            if (last_neighbor_is_bug) {
                clusters[clusters.length - 1].push(neighbors[neighbor]);
            } else {
                clusters.push([neighbors[neighbor]]);
                last_neighbor_is_bug = true;
            }
        } else {
            last_neighbor_is_bug = false;
        }
    }
    
    if (clusters.length < 2) {
        return true;
    } else {
        //only search one cluster, since we have to merge all clusters to pass anyway
        //This is polynomial time, but algorithms are hard, and N is small.
        for (i = 0; i < clusters[0].length; i += 1) {
            neighbors = getNeighbors(clusters[0][i]);
            for (neighbor = 0; neighbor < neighbors.length; neighbor += 1) {
                if (neighbors[neighbor].hasClass("bug")) {
                    //If this is the selected_piece, it doesn't belong in a cluster.
                    if (selected_piece.get(0) === neighbors[neighbor].get(0)) {
                        j = 0;
                    } else {
                        //Determine if the neighbor is a duplicate within the first cluster.
                        for (j = 0; j < clusters[0].length; j += 1) {
                            if (j !== i && neighbors[neighbor].get(0) === clusters[0][j].get(0)) {
                                break;
                            }
                        }
                    }
                    
                    //If a match was found, ignore this neighbor.
                    if (clusters[0].length === j) {
                        found = false;
                        //Otherwise search all other clusters.
                        for (j = 1; j < clusters.length && !found; j += 1) {
                            for (k = 0; k < clusters[j].length; k += 1) {
                                //If a match was found merge the clusters
                                if (neighbors[neighbor].get(0) === clusters[j][k].get(0)) {
                                    clusters[0] = clusters[0].concat(clusters[j]);
                                    clusters.splice(j, 1);
                                    found = true;
                                    break;
                                }
                            }
                        }
                        //If no match was found in any cluster, add the neighbor to cluster 0.
                        if (!found) {
                            clusters[0].push(neighbors[neighbor]);
                        }
                    }
                }
            }
        }
        if (clusters.length === 1) {
            return true;
        }
    }
    return false;
};

var updateBorders = function (updated_piece) {
    "use strict";
    var new_row, neighbors, offset_pieces, i;
    
    //Prepend columns as necessary.
    if (updated_piece.index() === 0) {
        $(".board_row").prepend(hexagon());
    }

    //Append columns as necessary.
    if (updated_piece.index() === updated_piece.siblings().length) {
        $(".board_row").append(hexagon());
    }

    //append rows as necessary.
    if (updated_piece.parent().index() ===
            updated_piece.parent().siblings().length) {
        new_row = $(templates.board_row({cols: 1}));
        $("#board").append(new_row);
        //Add as many placeholders as there are elements in the first row.
        for (i = 0; i < $("#board .board_row").first().children().length; i += 1) {
            new_row.append(hexagon());
        }
    }

    //prepend rows as necessary.
    if (updated_piece.parent().index() === 0) {
        new_row = $(templates.board_row());
        $("#board").prepend(new_row);
        //Add as many placeholders as there are elements in the last row.
        for (i = 0; i < $("#board .board_row").last().children().length; i += 1) {
            new_row.append(hexagon());
        }
        
        //Prepend odd rows to prevent relative positions changing.
        $("#board .board_row:nth-child(odd)").prepend(hexagon());
        //append even rows to keep row lengths consistent.
        $("#board .board_row:nth-child(even)").append(hexagon());
    }
    
    //Trim first row if unneeded.
    if ($("#board .board_row:nth-child(2) > .bug").length === 0) {
        $("#board .board_row:first-child").remove();
        
        //Prepend odd rows to prevent relative positions changing.
        $("#board .board_row:nth-child(odd)").prepend(hexagon());
        //append even rows to keep row lengths consistent.
        $("#board .board_row:nth-child(even)").append(hexagon());
    }
    
    //Trim last row if unneeded.
    if ($("#board .board_row:nth-last-child(2) > .bug").length === 0) {
        $("#board .board_row:last-child").remove();
    }
    
    //Trim excess rows to the right.
    if ($("#board .board_row > .bug:nth-last-child(2)").length === 0) {
        $("#board .board_row > :last-child").remove();
    }
    
    //Trim excess rows to the left.
    if ($("#board .board_row > .bug:nth-child(2)").length === 0) {
        $("#board .board_row > :first-child").remove();
    }
};

$(document).ready(function () {
    "use strict";
    var bug_name, i, selected_piece;
    
    for (bug_name in BUG_RULES) {
        if (BUG_RULES.hasOwnProperty(bug_name)) {
            $(".cache").append("<div id=\"" + bug_name + "\"></div>");
            for (i = BUG_RULES[bug_name].bug_count; i > 0; i -= 1) {
                $("#white_cache #" + bug_name).append((new Bug("white", bug_name, i)).createElement());
                $("#black_cache #" + bug_name).append((new Bug("black", bug_name, i)).createElement());
            }
        }
    }
    
    //Setup starting board. One row, with one column.
    $("#board").append(templates.board_row({cols: 1}));
    $(".board_row").append(hexagon());
    
    //Start showing the white cache.
    $("#white_cache").show();
    $("#black_cache").hide();
    
    //If the player selects a piece, change the board state to reflect the selection.
    $(".cache .bug").click(function () {
        var player, $this;
        $this = $(this);
        if (!black_victory && !white_victory && $this.is(":last-child")) {
            player = getPlayer($this);
            if (!$this.hasClass("bee")
                    && 0 === $("#board .bee." + player).length
                    && 2 < $("#board .bug." + player).length) {
                alert("Next move must be placement of bee.");
            } else if (setAvailabilityForPlacement(player)) {
                $(".selected").removeClass("selected");
                $this.addClass("selected");
                selected_piece = $this;
            } else {
                alert("No legal placement options.");
            }
        }
    });
    
    $("#board").on("click", ".bug:not(.buried):not(.available)", function (eventObject) {
        var player, $this;
        
        if (!black_victory && !white_victory) {
            $this = $(this);
            player = getPlayer($this);

            //Perform various checks to determine if the piece can move, and if not why.
            if (!$("#" + player + "_cache").is(':visible')) {
                alert("That isn't one of your pieces!");
            } else if (0 === $("#board .bee." + player).length) {
                alert("You must place your bee before making a move.");
            } else if (!canMove($this)) {
                alert("Moving that piece violates the one cluster rule.");
            } else if (!setAvailabilityForMove($this)) {
                alert("That piece has no legal moves.");
            } else {
                //No rule violations! select the piece.
                $(".selected").removeClass("selected");
                $this.addClass("selected");
                selected_piece = $this;
            }
        }
    });
    
    //on click of an available play space.
    $("#board").on("click", ".available", function (eventObject) {
        var $this, prev, i, neighbors;
        $this = $(this);
        //If the player has selected a piece to play, and the game isn't over.
        if (!black_victory && !white_victory && selected_piece) {
            //If the piece is moving from elsewhere on the board, replace it.
            if (selected_piece.parent(".board_row").length !== 0) {
                prev = selected_piece.prev();
                if (prev.hasClass("buried")) {
                    prev.removeClass("buried");
                } else {
                    $(hexagon()).insertAfter(selected_piece);
                }
            } else {
                //Remove handlers added while in the cache.
                selected_piece.off();
            }
            
            //If not a beetle, replace the clicked piece with the selected piece.
            //Otherwise stack/unstack the beetle.
            selected_piece.insertAfter($this);
            if ($this.hasClass("bug")) {
                $this.addClass("buried");
            } else {
                $this.remove();
            }
            
            //Resize the board as necessary.
            updateBorders(selected_piece);
            
            //swap the visible player cache.
            $("#white_cache").toggle();
            $("#black_cache").toggle();
            
            //Reset the piece selection state of the board.
            selected_piece = undefined;
            $("#board .available").removeClass("available");
            $(".selected").removeClass("selected");
            
            //Determine if a player has won the game.
            neighbors = getNeighbors($(".white.bee"));
            for (i = 0; i < neighbors.length; i += 1) {
                if (undefined === neighbors[i] || !neighbors[i].hasClass("bug")) {
                    break;
                }
            }
            if (neighbors.length === i) {
                black_victory = true;
            }
            
            neighbors = getNeighbors($(".black.bee"));
            for (i = 0; i < neighbors.length; i += 1) {
                if (undefined === neighbors[i] || !neighbors[i].hasClass("bug")) {
                    break;
                }
            }
            if (neighbors.length === i) {
                white_victory = true;
            }
            
            if (black_victory && !white_victory) {
                alert("Black has won the game!");
            } else if (white_victory && !black_victory) {
                alert("White has won the game!");
            } else if (white_victory && black_victory) {
                alert("Both players lost simultaneously, so it was a draw!");
            }
        }
    });
});