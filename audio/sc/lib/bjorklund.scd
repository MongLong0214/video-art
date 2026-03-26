// Bjorklund algorithm — generates Euclidean rhythms
// Usage: ~bjorklund.(hits, steps) → Array of 0s and 1s

~bjorklund = { |hits, steps|
	var pattern, counts, remainders, divisor, level;

	if(hits == 0, { Array.fill(steps, 0) }, {
		if(hits >= steps, { Array.fill(steps, 1) }, {
			pattern = Array.new;
			counts = Array.new;
			remainders = Array.new;

			divisor = steps - hits;
			remainders = remainders.add(hits);
			level = 0;

			while({ remainders[level] > 1 }, {
				counts = counts.add((divisor / remainders[level]).floor.asInteger);
				remainders = remainders.add(divisor % remainders[level]);
				divisor = remainders[level];
				level = level + 1;
			});
			counts = counts.add(divisor);

			// Build pattern
			pattern = { |l|
				var build;
				build = { |lv|
					if(lv == -1, {
						[0]
					}, {
						if(lv == -2, {
							[1]
						}, {
							var seq = build.(lv - 1);
							var tail = build.(lv - 2);
							var result = Array.new;
							counts[lv].do { result = result ++ seq };
							if(remainders[lv] > 0, {
								result = result ++ tail;
							});
							result;
						});
					});
				};
				build.(l);
			}.(level);

			pattern;
		});
	});
};

"Bjorklund algorithm loaded.".postln;
